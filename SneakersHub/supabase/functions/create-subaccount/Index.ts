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
    const { data: seller, error: sellerErr } = await supabase
      .from("profiles").select("name").eq("id", seller_id).single();
    console.log("[create-subaccount] seller fetch:", { seller, sellerErr, seller_id });
    console.log("[create-subaccount] subaccount params:", { settlement_bank, account_number, percentage_charge, splitPercentage: percentage_charge ?? 95 });
    if (sellerErr || !seller) throw new Error(`Seller not found: ${sellerErr?.message ?? "no row"}`);

    // ── Create Paystack subaccount ────────────────────────────────────────────
    const splitPercentage = Number(percentage_charge ?? 5); // platform's cut — seller gets (100 - splitPercentage)%

    // Paystack GH subaccount expects MoMo numbers as 0XXXXXXXXX (10 digits, leading 0)
    // Bank account numbers are passed as-is
    const isMoMo = !["ghipss","030100","040100","050100","060100","070101","080100","090100","100100","110100","120100","130100","140100","150100","190100"].includes(settlement_bank);
    const normalizedNumber = isMoMo
      ? (() => {
          // Strip everything, then ensure it starts with 0
          let n = account_number.replace(/\s+/g, "").replace(/^\+/, "");
          if (n.startsWith("233")) n = "0" + n.slice(3);
          if (!n.startsWith("0")) n = "0" + n;
          return n; // e.g. "0506054670"
        })()
      : account_number;

    console.log("[create-subaccount] normalized:", { isMoMo, normalizedNumber, settlement_bank, account_number });

    const subRes = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: seller.name,
        settlement_bank,
        account_number: normalizedNumber,
        percentage_charge: splitPercentage, // platform keeps this %, seller gets the rest
        description: `SneakersHub seller: ${seller.name}`,
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