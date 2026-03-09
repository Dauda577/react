import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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
      .select("id, buyer_id, release_at")
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
        const msLeft = releaseDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

        const { error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            type: "order.dispute_reminder",
            record: {
              buyer_id: order.buyer_id,
              order_id: order.id,
              release_at: order.release_at,
              days_left: daysLeft,
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