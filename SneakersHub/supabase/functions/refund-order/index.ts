import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET      = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY")!;
const ARKESEL_API_KEY      = Deno.env.get("ARKESEL_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendSMS = async (to: string, message: string) => {
  await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "SneakersHub", message, recipients: [to] }),
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: only official (admin) accounts can issue refunds ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const callerClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: callerProfile } = await supabase
      .from("profiles").select("is_official").eq("id", caller.id).single();
    if (!callerProfile?.is_official) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), { status: 403, headers: corsHeaders });
    }

    const { order_id, paystack_reference, reason, buyer_phone, seller_phone } = await req.json();
    if (!order_id || !reason) {
      return new Response("Missing fields", { status: 400, headers: corsHeaders });
    }

    console.log("[refund-order] Issuing refund for order:", order_id, "ref:", paystack_reference);

    // ── Step 1: Call Paystack refund API ──
    const paystackRes = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: paystack_reference,
        merchant_note: reason,
      }),
    });

    const paystackData = await paystackRes.json();
    console.log("[refund-order] Paystack response:", JSON.stringify(paystackData));

    if (!paystackData.status) {
      throw new Error(`Paystack refund failed: ${paystackData.message}`);
    }

    // ── Step 2: Update order status in DB ──
    const { error: dbError } = await supabase
      .from("orders")
      .update({
        payout_status: "refunded",
        dispute_reason: reason,
      })
      .eq("id", order_id);

    if (dbError) throw dbError;

    // ── Step 3: SMS buyer ──
    if (buyer_phone) {
      await sendSMS(buyer_phone,
        `SneakersHub: Your refund for order ${order_id.slice(0,8).toUpperCase()} has been issued. Reason: ${reason}. Funds will appear in your account within 5–10 business days.`
      );
    }

    // ── Step 4: SMS seller ──
    if (seller_phone) {
      await sendSMS(seller_phone,
        `SneakersHub: Order ${order_id.slice(0,8).toUpperCase()} has been refunded to the buyer. Reason: ${reason}. Contact support if you have questions. sneakershub.site`
      );
    }

    console.log("[refund-order] Refund completed successfully for order:", order_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[refund-order] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});