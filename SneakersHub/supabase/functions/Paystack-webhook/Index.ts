import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const PAYSTACK_SECRET      = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Verify Paystack signature ────────────────────────────────────────────────
function verifySignature(body: string, signature: string): boolean {
  const hash = createHmac("sha512", PAYSTACK_SECRET).update(body).digest("hex");
  return hash === signature;
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
  // Paystack sends POST only
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body      = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  // ── Verify this is actually from Paystack ────────────────────────────────
  if (!verifySignature(body, signature)) {
    console.warn("Invalid Paystack signature — request rejected");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log(`[paystack-webhook] event=${event.event}`);

  // ── transfer.success ─────────────────────────────────────────────────────
  if (event.event === "transfer.success") {
    const transferCode = event.data?.transfer_code;
    const amount       = event.data?.amount / 100; // convert from pesewas
    console.log(`Transfer SUCCESS: ${transferCode} GHS ${amount}`);

    // Find the order with this transfer_code
    const { data: order } = await supabase
      .from("orders")
      .select("id, seller_id, total, payout_status")
      .eq("transfer_code", transferCode)
      .single();

    if (order) {
      // Confirm the transfer actually landed
      await supabase.from("orders").update({
        transfer_confirmed_at: new Date().toISOString(),
        transfer_confirmed: true,
      }).eq("id", order.id);

      console.log(`Order ${order.id} transfer confirmed ✓`);
    } else {
      console.warn(`No order found for transfer_code ${transferCode}`);
    }
  }

  // ── transfer.failed ──────────────────────────────────────────────────────
  if (event.event === "transfer.failed") {
    const transferCode = event.data?.transfer_code;
    const failReason   = event.data?.gateway_response ?? "Unknown failure";
    console.error(`Transfer FAILED: ${transferCode} reason: ${failReason}`);

    // Find the order
    const { data: order } = await supabase
      .from("orders")
      .select("id, seller_id, total, transfer_attempts")
      .eq("transfer_code", transferCode)
      .single();

    if (!order) {
      console.warn(`No order found for failed transfer_code ${transferCode}`);
      return new Response("ok", { status: 200 });
    }

    const attempts = (order.transfer_attempts ?? 1) + 1;

    // Mark as transfer_failed — admin sees this in dashboard
    await supabase.from("orders").update({
      payout_status: "transfer_failed",
      transfer_failure_reason: failReason,
      transfer_failed_at: new Date().toISOString(),
      transfer_attempts: attempts,
      transfer_confirmed: false,
    }).eq("id", order.id);

    // Fetch seller details for SMS
    const { data: seller } = await supabase
      .from("profiles")
      .select("name, phone, payout_method")
      .eq("id", order.seller_id)
      .single();

    // SMS seller
    try {
      await supabase.functions.invoke("send-sms", {
        body: {
          type: "payout.transfer_failed",
          record: {
            seller_id: order.seller_id,
            seller_phone: seller?.phone,
            order_id: order.id,
            reason: failReason,
            attempts,
          },
        },
      });
    } catch (e) { console.warn("SMS failed:", e); }

    // Alert admin
    await notifyAdmin(
      `🚨 Transfer FAILED (Paystack confirmed): Order ${order.id.slice(0,8)} — GHS ${order.total} to ${seller?.name ?? "seller"} (${seller?.payout_method}). Attempt ${attempts}. Reason: ${failReason}. Fix at sneakershub-sigma.vercel.app/admin`
    );
  }

  // ── transfer.reversed ────────────────────────────────────────────────────
  if (event.event === "transfer.reversed") {
    const transferCode = event.data?.transfer_code;
    console.warn(`Transfer REVERSED: ${transferCode}`);

    const { data: order } = await supabase
      .from("orders")
      .select("id, seller_id, total")
      .eq("transfer_code", transferCode)
      .single();

    if (order) {
      await supabase.from("orders").update({
        payout_status: "transfer_failed",
        transfer_failure_reason: "Transfer reversed by Paystack",
        transfer_failed_at: new Date().toISOString(),
        transfer_confirmed: false,
      }).eq("id", order.id);

      await notifyAdmin(
        `⚠️ Transfer REVERSED: Order ${order.id.slice(0,8)} — GHS ${order.total}. Payout marked failed. Review at /admin`
      );
    }
  }

  // Always return 200 to Paystack — otherwise they retry
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});