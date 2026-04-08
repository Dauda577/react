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

    if (sellerErr || !seller) throw new Error(`Seller not found: ${sellerErr?.message ?? "no row"}`);

    // ── Fetch payout details from the approved seller application ─────────────
    const { data: application } = await supabase
      .from("seller_applications")
      .select("momo_number, momo_name")
      .eq("user_id", seller_id)
      .in("status", ["approved", "paid"])
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("[create-subaccount] application payout data:", application);

    // ── Normalize MoMo number to 0XXXXXXXXX format ────────────────────────────
    const isMoMo = !["ghipss","030100","040100","050100","060100","070101","080100","090100","100100","110100","120100","130100","140100","150100","190100"].includes(settlement_bank);
    const normalizedNumber = isMoMo
      ? (() => {
          let n = account_number.replace(/\s+/g, "").replace(/^\+/, "");
          if (n.startsWith("233")) n = "0" + n.slice(3);
          if (!n.startsWith("0")) n = "0" + n;
          return n;
        })()
      : account_number;

    console.log("[create-subaccount] normalized:", { isMoMo, normalizedNumber, settlement_bank, account_number });

    // ── Resolve account name from Paystack BEFORE creating subaccount ─────────
    let resolvedName = seller.name; // fallback to profile name
    try {
      const resolveRes = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${normalizedNumber}&bank_code=${settlement_bank}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const resolveData = await resolveRes.json();
      console.log("[create-subaccount] name resolution:", JSON.stringify(resolveData));

      if (resolveData.status && resolveData.data?.account_name) {
        resolvedName = resolveData.data.account_name; // ✅ use exact name from network
        console.log(`[create-subaccount] resolved name: "${resolvedName}"`);
      } else {
        console.warn("[create-subaccount] name resolution failed, using profile name as fallback");
      }
    } catch (resolveErr) {
      console.warn("[create-subaccount] name resolution error:", resolveErr);
      // non-fatal — continue with profile name
    }

    // ── Platform takes 5%, seller receives 95% ────────────────────────────────
    const platformPercentage = Number(percentage_charge ?? 5);
    console.log("[create-subaccount] split config:", { platformPercentage, sellerPercentage: 100 - platformPercentage });

    const subRes = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name:     resolvedName,       // ✅ exact name from MoMo/bank network
        settlement_bank,
        account_number:    normalizedNumber,
        percentage_charge: platformPercentage, // ✅ 5 = platform takes 5%, seller gets 95%
        description:       `SneakersHub seller: ${resolvedName}`,
        metadata:          { seller_id },
      }),
    });

    const subData = await subRes.json();
    console.log("[create-subaccount] Paystack response:", JSON.stringify(subData));

    if (!subData.status) {
      throw new Error(`Subaccount creation failed: ${subData.message}`);
    }

    const subaccountCode = subData.data.subaccount_code;

    // ── Derive payout_method from settlement_bank ─────────────────────────────
    const payoutMethod = settlement_bank === "VOD" ? "momo_telecel"
      : settlement_bank === "ATL" ? "momo_airteltigo"
      : "momo_mtn";

    // ── Save subaccount code to profile, mark verified, and sync payout details ─
    const { error: updateErr } = await supabase.from("profiles").update({
      subaccount_code:       subaccountCode,
      verified:              true,
      verification_fee_paid: true,
      payout_method:         payoutMethod,
      payout_number:         application?.momo_number ?? normalizedNumber,
      payout_name:           resolvedName, // ✅ save the network-verified name
    }).eq("id", seller_id);

    if (updateErr) throw new Error(`Profile update failed: ${updateErr.message}`);

    console.log(`[create-subaccount] ✅ Created ${subaccountCode} for seller ${seller_id}`);

    return new Response(JSON.stringify({
      success:         true,
      subaccount_code: subaccountCode,
      resolved_name:   resolvedName,
      split: { platform_percentage: platformPercentage, seller_percentage: 100 - platformPercentage },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[create-subaccount] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});