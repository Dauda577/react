import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ARKESEL_API_KEY      = Deno.env.get("ARKESEL_API_KEY")!;
const ARKESEL_SENDER_ID    = Deno.env.get("ARKESEL_SENDER_ID") || "SneakersHub";
const APP_URL              = "https://sneakershub.site";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhone(phone: string): string | null {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0"))    n = "233" + n.slice(1);
  if (!n.startsWith("233")) n = "233" + n;
  return n.length === 12 ? n : null;
}

async function sendSms(phone: string, message: string) {
  const formatted = formatPhone(phone);
  if (!formatted) return;
  await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": ARKESEL_API_KEY },
    body: JSON.stringify({
      sender: ARKESEL_SENDER_ID,
      message,
      recipients: [formatted],
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // ── Find orders delivered 20-28hrs ago with no review ─────────────────
    const now = new Date();
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const twentyEightHoursAgo = new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_id,
        seller_id,
        buyer_phone,
        buyer_first_name,
        delivered_at,
        order_items ( name )
      `)
      .eq("status", "delivered")
      .gte("delivered_at", twentyEightHoursAgo)
      .lte("delivered_at", twentyHoursAgo)
      .not("delivered_at", "is", null);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ success: true, reminded: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reminded = 0;

    for (const order of orders as any[]) {
      // Check if buyer already left a review for this seller
      const { data: existingReview } = await supabase
        .from("reviews")
        .select("id")
        .eq("buyer_id", order.buyer_id)
        .eq("seller_id", order.seller_id)
        .eq("order_id", order.id)
        .maybeSingle();

      if (existingReview) continue; // already reviewed

      // Check if we already sent a reminder for this order
      const { data: alreadyReminded } = await supabase
        .from("review_reminders")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (alreadyReminded) continue; // already sent

      const itemName = order.order_items?.[0]?.name ?? "your recent purchase";
      const buyerName = order.buyer_first_name ?? "there";
      const phone = order.buyer_phone;

      if (phone) {
        await sendSms(
          phone,
          `Hi ${buyerName}! How was your ${itemName} from SneakersHub? Your review helps other buyers and takes 30 seconds. Rate your seller here: ${APP_URL}/account?tab=orders`
        );
      }

      // Record that we sent the reminder
      await supabase.from("review_reminders").insert({
        order_id: order.id,
        buyer_id: order.buyer_id,
        sent_at: now.toISOString(),
      });

      reminded++;
    }

    return new Response(JSON.stringify({ success: true, reminded }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("review-reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});