import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET      = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Called after a seller pays the verification fee via Paystack.
 * Creates a Paystack subaccount for them and saves the code to their profile.
 * The subaccount splits all future payments automatically at checkout.
 *
 * Body: { seller_id, paystack_reference, settlement_bank, account_number, percentage_charge }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};

    const { seller_id, paystack_reference, settlement_bank, account_number, percentage_charge } = body;

    if (!seller_id)          throw new Error("seller_id is required");
    if (!paystack_reference) throw new Error("paystack_reference is required");
    if (!settlement_bank)    throw new Error("settlement_bank is required");
    if (!account_number)     throw new Error("account_number is required");

    console.log(`[create-subaccount] seller=${seller_id} ref=${paystack_reference}`);

    // ── Verify the reference payment actually went through ───────────────────
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${paystack_reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(JSON.stringify({ error: "Payment verification failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch seller name ─────────────────────────────────────────────────────
    const { data: seller } = await supabase
      .from("profiles").select("name, email").eq("id", seller_id).single();
    if (!seller) throw new Error("Seller not found");

    // ── Create Paystack subaccount ────────────────────────────────────────────
    const splitPercentage = percentage_charge ?? 95; // seller gets 95% by default

    const subRes = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: seller.name,
        settlement_bank,           // bank code e.g. "MTN" for MoMo
        account_number,            // MoMo number or bank account
        percentage_charge: splitPercentage,
        description: `SneakersHub seller: ${seller.name}`,
        primary_contact_email: seller.email ?? undefined,
        metadata: { seller_id },
      }),
    });

    const subData = await subRes.json();
    console.log("[create-subaccount] Paystack response:", JSON.stringify(subData));

    if (!subData.status) {
      throw new Error(`Subaccount creation failed: ${subData.message}`);
    }

    const subaccountCode = subData.data.subaccount_code;

    // ── Save subaccount code to profile & mark verified ───────────────────────
    const { error: updateErr } = await supabase.from("profiles").update({
      subaccount_code: subaccountCode,
      verified: true,
      verification_fee_paid: true,
    }).eq("id", seller_id);

    if (updateErr) throw new Error(`Profile update failed: ${updateErr.message}`);

    console.log(`[create-subaccount] ✅ Created ${subaccountCode} for seller ${seller_id}`);

    return new Response(JSON.stringify({
      success: true,
      subaccount_code: subaccountCode,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[create-subaccount] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});