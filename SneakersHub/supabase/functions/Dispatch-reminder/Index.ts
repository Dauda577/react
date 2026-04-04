import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

    // Find orders where:
    // - Seller confirmed (release_at is set)
    // - Buyer has NOT confirmed
    // - Payout is still pending (not disputed or released)
    // - release_at is in the future (not yet auto-released)
    // - release_at is within the next 2 days (days 1 and 2 reminder window)
    const { data: pendingOrders, error } = await supabase
      .from("orders")
      .select("id, buyer_id, buyer_phone, release_at")
      .eq("seller_confirmed", true)
      .eq("buyer_confirmed", false)
      .eq("payout_status", "pending")
      .gt("release_at", now.toISOString())
      .lte("release_at", twoDaysFromNow);

    if (error) throw new Error("Failed to fetch pending orders: " + error.message);

    console.log(`Found ${pendingOrders?.length ?? 0} orders needing reminders`);

    let sent = 0;
    let failed = 0;

    for (const order of (pendingOrders ?? [])) {
      try {
        const releaseDate = new Date(order.release_at);
        const msLeft      = releaseDate.getTime() - now.getTime();
        const daysLeft    = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

        // Resolve buyer phone — prefer the denormalised column on the order,
        // fall back to a profiles lookup if it's missing.
        let buyerPhone: string = order.buyer_phone ?? "";
        if (!buyerPhone && order.buyer_id) {
          const { data: buyer } = await supabase
            .from("profiles")
            .select("phone")
            .eq("id", order.buyer_id)
            .single();
          buyerPhone = buyer?.phone ?? "";
        }

        if (!buyerPhone) {
          console.warn(`No phone for buyer on order ${order.id} — skipping`);
          failed++;
          continue;
        }

        // Use the existing "order.shipped" type as the vehicle for the reminder
        // message, overriding the message text directly so send-sms doesn't need
        // a new case. The buyer_phone field is what send-sms reads for this type.
        const { error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            type: "order.shipped",
            record: {
              id: order.id,
              buyer_phone: buyerPhone,
              // Override the default shipped message with a dispute reminder
              _override_message: `⏰ Reminder: Please confirm receipt of your SneakersHub order #${order.id.slice(-8)}. Payment releases to the seller in ${daysLeft} day${daysLeft === 1 ? "" : "s"} if unconfirmed. Confirm at sneakershub.site/account`,
            },
          },
        });

        if (smsError) throw smsError;
        sent++;
        console.log(`Reminder sent for order ${order.id}, ${daysLeft} days left`);
      } catch (err) {
        console.warn(`Failed to send reminder for order ${order.id}:`, err);
        failed++;
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ success: true, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Dispatch reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});