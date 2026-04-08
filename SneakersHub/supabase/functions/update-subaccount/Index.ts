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
    const { seller_id, subaccount_code, settlement_bank, account_number } = await req.json();

    if (!seller_id)       throw new Error("seller_id is required");
    if (!subaccount_code) throw new Error("subaccount_code is required");
    if (!settlement_bank) throw new Error("settlement_bank is required");
    if (!account_number)  throw new Error("account_number is required");

    console.log(`[update-subaccount] seller=${seller_id} subaccount=${subaccount_code}`);

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

    console.log("[update-subaccount] normalized:", { isMoMo, normalizedNumber, settlement_bank });

    // ── Resolve account name from Paystack BEFORE updating subaccount ─────────
    let resolvedName: string | null = null;
    try {
      const resolveRes = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${normalizedNumber}&bank_code=${settlement_bank}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const resolveData = await resolveRes.json();
      console.log("[update-subaccount] name resolution:", JSON.stringify(resolveData));

      if (resolveData.status && resolveData.data?.account_name) {
        resolvedName = resolveData.data.account_name; // ✅ exact name from network
        console.log(`[update-subaccount] resolved name: "${resolvedName}"`);
      } else {
        console.warn("[update-subaccount] name resolution failed, business_name unchanged");
      }
    } catch (resolveErr) {
      console.warn("[update-subaccount] name resolution error:", resolveErr);
      // non-fatal — continue without updating business_name
    }

    // ── Update Paystack subaccount ────────────────────────────────────────────
    const res = await fetch(`https://api.paystack.co/subaccount/${subaccount_code}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settlement_bank,
        account_number:  normalizedNumber,
        ...(resolvedName && { business_name: resolvedName }), // ✅ only update if resolved
      }),
    });

    const data = await res.json();
    console.log("[update-subaccount] Paystack response:", JSON.stringify(data));

    if (!data.status) {
      throw new Error(`Paystack update failed: ${data.message}`);
    }

    // ── Derive payout_method from settlement_bank ─────────────────────────────
    const payoutMethod = settlement_bank === "VOD" ? "momo_telecel"
      : settlement_bank === "ATL" ? "momo_airteltigo"
      : "momo_mtn";

    // ── Sync all payout fields in profile ─────────────────────────────────────
    const { error: updateErr } = await supabase.from("profiles").update({
      payout_bank_code: settlement_bank,
      payout_method:    payoutMethod,
      payout_number:    normalizedNumber,
      payout_name:      resolvedName ?? data.data?.account_name ?? null, // ✅ resolved name
    }).eq("id", seller_id);

    if (updateErr) throw new Error(`Profile update failed: ${updateErr.message}`);

    console.log(`[update-subaccount] ✅ Updated ${subaccount_code} for seller ${seller_id}`);

    return new Response(JSON.stringify({
      success:       true,
      resolved_name: resolvedName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[update-subaccount] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});