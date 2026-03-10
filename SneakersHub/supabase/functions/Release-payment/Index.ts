import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET  = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMMISSION_RATE  = 0.05;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "").replace(/^233/, "").replace(/^0/, "");
  return `233${p}`;
}

function getBankCode(method: string): string {
  if (method === "momo_mtn")    return "MTN";
  if (method === "momo_telecel") return "VOD";
  return "ghipss";
}

async function createRecipient(name: string, accountNumber: string, method: string) {
  const type     = method === "bank" ? "ghipss" : "mobile_money";
  const bankCode = getBankCode(method);
  const res = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type, name, account_number: normalizePhone(accountNumber), bank_code: bankCode, currency: "GHS" }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(`Recipient creation failed: ${data.message}`);
  return data.data.recipient_code as string;
}

async function initiateTransfer(recipientCode: string, amountGHS: number, orderId: string) {
  const amountPesewas = Math.round(amountGHS * 100);
  const res = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "balance",
      amount: amountPesewas,
      recipient: recipientCode,
      reason: `SneakersHub payout order ${orderId.slice(0, 8)}`,
      currency: "GHS",
    }),
  });
  const data = await res.json();
  if (!data.status) throw new Error(`Transfer initiation failed: ${data.message}`);
  return data.data as { transfer_code: string; status: string };
}

async function notifyAdmin(message: string) {
  try {
    const { data } = await supabase.from("profiles").select("phone").eq("is_official", true).single();
    if (data?.phone) {
      await supabase.functions.invoke("send-sms", {
        body: { type: "admin.alert", record: { phone: data.phone, message } },
      });
    }
  } catch (e) { console.warn("Admin notify failed:", e); }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id, trigger } = await req.json();
    if (!order_id) throw new Error("order_id is required");

    console.log(`[release-payment] order=${order_id} trigger=${trigger}`);

    // ── Fetch order ──────────────────────────────────────────────────────────
    const { data: order, error: orderErr } = await supabase
      .from("orders").select("*").eq("id", order_id).single();

    if (orderErr || !order) throw new Error("Order not found");

    // ── Guard: skip already-processed orders ────────────────────────────────
    if (order.payout_status !== "pending") {
      console.log(`Order ${order_id} already ${order.payout_status} — skipping`);
      return new Response(JSON.stringify({ message: `Already ${order.payout_status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Guard: never release a disputed order ───────────────────────────────
    if (order.payout_status === "disputed") {
      return new Response(JSON.stringify({ message: "Disputed — manual resolution required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch seller ─────────────────────────────────────────────────────────
    const { data: seller, error: sellerErr } = await supabase
      .from("profiles")
      .select("is_official, verified, payout_method, payout_number, payout_name, name, phone")
      .eq("id", order.seller_id)
      .single();

    if (sellerErr || !seller) throw new Error("Seller not found");

    // ── Official seller — direct sale, no transfer ───────────────────────────
    if (seller.is_official) {
      await supabase.from("orders").update({ payout_status: "released" }).eq("id", order_id);
      return new Response(JSON.stringify({ success: true, message: "Official — no transfer needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard seller — pay on delivery, no transfer ───────────────────────
    if (!seller.verified) {
      await supabase.from("orders").update({ payout_status: "released" }).eq("id", order_id);
      return new Response(JSON.stringify({ success: true, message: "Standard seller — pay on delivery" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Verified seller — check payout details ───────────────────────────────
    if (!seller.payout_method || !seller.payout_number) {
      // Mark as transfer_failed so admin can see it
      await supabase.from("orders").update({
        payout_status: "transfer_failed",
        transfer_failure_reason: "Seller has no payout details configured",
        transfer_failed_at: new Date().toISOString(),
        transfer_attempts: (order.transfer_attempts ?? 0) + 1,
      }).eq("id", order_id);

      // SMS seller
      try {
        await supabase.functions.invoke("send-sms", {
          body: { type: "payout.missing_details", record: { seller_id: order.seller_id, seller_phone: seller.phone, order_id } },
        });
      } catch (e) { console.warn("SMS failed:", e); }

      // Alert admin
      await notifyAdmin(`⚠️ Payout failed for order ${order_id.slice(0, 8)} — seller has no payout details set.`);

      return new Response(JSON.stringify({ success: false, message: "No payout details — marked as transfer_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Calculate payout ─────────────────────────────────────────────────────
    const commission   = Math.round(order.total * COMMISSION_RATE * 100) / 100;
    const payoutAmount = Math.round((order.total - commission) * 100) / 100;
    console.log(`Total: GHS ${order.total} | Commission: GHS ${commission} | Payout: GHS ${payoutAmount}`);

    // ── Create recipient & initiate transfer ─────────────────────────────────
    let transferCode: string;
    let transferStatus: string;

    try {
      const recipientCode = await createRecipient(
        seller.payout_name ?? seller.name,
        seller.payout_number,
        seller.payout_method
      );
      const transfer = await initiateTransfer(recipientCode, payoutAmount, order_id);
      transferCode   = transfer.transfer_code;
      transferStatus = transfer.status;
      console.log(`Transfer initiated: ${transferCode} status: ${transferStatus}`);
    } catch (transferErr) {
      console.error("Transfer failed:", transferErr);

      const attempts = (order.transfer_attempts ?? 0) + 1;
      const reason   = String(transferErr);

      // Mark order as transfer_failed with full details
      await supabase.from("orders").update({
        payout_status: "transfer_failed",
        transfer_failure_reason: reason,
        transfer_failed_at: new Date().toISOString(),
        transfer_attempts: attempts,
      }).eq("id", order_id);

      // SMS seller — their payout failed
      try {
        await supabase.functions.invoke("send-sms", {
          body: {
            type: "payout.transfer_failed",
            record: {
              seller_id: order.seller_id,
              seller_phone: seller.phone,
              order_id,
              reason,
              attempts,
            },
          },
        });
      } catch (e) { console.warn("SMS failed:", e); }

      // Alert admin with full context
      await notifyAdmin(
        `🚨 Transfer FAILED for order ${order_id.slice(0,8)} — GHS ${payoutAmount} to ${seller.name} (${seller.payout_method}). Attempt ${attempts}. Reason: ${reason.slice(0, 100)}. Fix at /admin`
      );

      return new Response(JSON.stringify({ success: false, error: reason, attempts }), {
        status: 200, // don't 500 — let auto-release log it cleanly
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Transfer initiated — update order ────────────────────────────────────
    // Note: "pending" from Paystack means queued, not failed.
    // The webhook will confirm actual success/failure.
    const newStatus = trigger === "auto" ? "auto_released" : "released";
    await supabase.from("orders").update({
      payout_status: newStatus,
      transfer_code: transferCode,
      transfer_initiated_at: new Date().toISOString(),
    }).eq("id", order_id);

    // SMS seller — payout on its way
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
    } catch (e) { console.warn("SMS failed (non-fatal):", e); }

    return new Response(JSON.stringify({
      success: true,
      transfer_code: transferCode,
      transfer_status: transferStatus,
      payout_amount: payoutAmount,
      commission,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[release-payment] Unhandled error:", err);
    await notifyAdmin(`🚨 release-payment crashed: ${String(err).slice(0, 150)}`).catch(() => {});
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});