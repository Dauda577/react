import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMMISSION_RATE = 0.05; // 5%

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Normalize phone to Paystack format (2348XXXXXXXX) ────────────────────────
function normalizePhone(phone: string, method: string): string {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "").replace(/^233/, "").replace(/^0/, "");
  return `233${p}`;
}

// ── Resolve Paystack bank code from payout method ─────────────────────────────
function getBankCode(method: string): string {
  // Paystack Ghana MoMo bank codes
  if (method === "momo_mtn") return "MTN";
  if (method === "momo_telecel") return "VOD"; // Vodafone/Telecel
  return "GHA"; // Generic Ghana bank fallback
}

// ── Create a Paystack transfer recipient ─────────────────────────────────────
async function createRecipient(name: string, accountNumber: string, method: string) {
  const type = method === "bank" ? "ghipss" : "mobile_money";
  const currency = "GHS";
  const bankCode = getBankCode(method);

  const res = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(`Recipient creation failed: ${data.message}`);
  return data.data.recipient_code;
}

// ── Initiate Paystack transfer ─────────────────────────────────────────────────
async function initiateTransfer(recipientCode: string, amountGHS: number, orderId: string) {
  const amountKobo = Math.round(amountGHS * 100); // Paystack uses smallest currency unit
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: amountKobo,
      recipient: recipientCode,
      reason: `SneakersHub payout for order ${orderId}`,
      currency: "GHS",
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(`Transfer failed: ${data.message}`);
  return data.data;
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id, trigger } = await req.json();
    if (!order_id) throw new Error("order_id is required");

    console.log(`Processing payout for order ${order_id}, trigger: ${trigger}`);

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (order.payout_status !== "pending") {
      return new Response(JSON.stringify({ message: `Order already ${order.payout_status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.payout_status === "disputed") throw new Error("Order is disputed — cannot auto-release");

    // Check if seller is official — official accounts bypass escrow entirely
    const { data: sellerCheck } = await supabase
      .from("profiles")
      .select("is_official")
      .eq("id", order.seller_id)
      .single();

    if (sellerCheck?.is_official) {
      console.log(`Seller is official — skipping escrow payout for order ${order_id}`);
      return new Response(JSON.stringify({ message: "Official seller — no escrow payout needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Official sellers bypass escrow — their sales are direct, no payout transfer needed
    const { data: sellerProfile } = await supabase
      .from("profiles").select("is_official").eq("id", order.seller_id).single();
    if (sellerProfile?.is_official) {
      await supabase.from("orders").update({ payout_status: "released" }).eq("id", order_id);
      return new Response(JSON.stringify({ success: true, message: "Official seller — direct sale, no transfer needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch seller payout details + verified status
    const { data: seller, error: sellerErr } = await supabase
      .from("profiles")
      .select("payout_method, payout_number, payout_name, name, phone, verified")
      .eq("id", order.seller_id)
      .single();

    if (sellerErr || !seller) throw new Error("Seller not found");

    // Standard (unverified) sellers use pay-on-delivery — no payout transfer needed
    if (!seller.verified) {
      console.log(`Standard seller ${order.seller_id} — pay on delivery, no transfer needed`);
      await supabase.from("orders").update({ payout_status: "released" }).eq("id", order_id);
      return new Response(JSON.stringify({ message: "Standard seller — pay on delivery, no transfer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verified seller but no payout details — hold funds and SMS them
    if (!seller.payout_method || !seller.payout_number) {
      console.warn(`Verified seller ${order.seller_id} has no payout details`);

      // SMS the seller to add their payout details
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "payout.missing_details",
            record: {
              seller_id: order.seller_id,
              seller_phone: seller.phone,
              order_id,
            },
          },
        });
      } catch (e) { console.warn("SMS failed:", e); }

      // Keep payout_status as pending — funds stay held until they add details
      return new Response(JSON.stringify({
        success: false,
        message: "Payout held — seller has no payout details. SMS sent.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate payout (total minus 5% commission)
    const commission = Math.round(order.total * COMMISSION_RATE * 100) / 100;
    const payoutAmount = Math.round((order.total - commission) * 100) / 100;

    console.log(`Order total: GHS ${order.total}, Commission: GHS ${commission}, Payout: GHS ${payoutAmount}`);

    // Create Paystack recipient
    const recipientCode = await createRecipient(
      seller.payout_name ?? seller.name,
      seller.payout_number,
      seller.payout_method
    );

    // Initiate transfer
    const transfer = await initiateTransfer(recipientCode, payoutAmount, order_id);
    console.log("Transfer initiated:", transfer.transfer_code);

    // Update order status
    const newStatus = trigger === "auto" ? "auto_released" : "released";
    await supabase
      .from("orders")
      .update({ payout_status: newStatus })
      .eq("id", order_id);

    // Notify seller via SMS
    try {
      await supabase.functions.invoke("send-sms", {
        body: {
          type: "payout.released",
          record: {
            seller_id: order.seller_id,
            amount: payoutAmount,
            order_total: order.total,
            order_id,
            trigger,
            payout_method: seller.payout_method,
          },
        },
      });
    } catch (smsErr) {
      console.warn("SMS notification failed (non-fatal):", smsErr);
    }

    return new Response(JSON.stringify({
      success: true,
      transfer_code: transfer.transfer_code,
      payout_amount: payoutAmount,
      commission,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Release payment error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});