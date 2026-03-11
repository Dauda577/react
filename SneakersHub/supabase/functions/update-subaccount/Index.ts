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
 * Updates an existing Paystack subaccount with new bank/MoMo details.
 * Called when a verified seller changes their payout details.
 * Body: { seller_id, subaccount_code, settlement_bank, account_number }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { seller_id, subaccount_code, settlement_bank, account_number } = await req.json();

    if (!seller_id)        throw new Error("seller_id is required");
    if (!subaccount_code)  throw new Error("subaccount_code is required");
    if (!settlement_bank)  throw new Error("settlement_bank is required");
    if (!account_number)   throw new Error("account_number is required");

    console.log(`[update-subaccount] seller=${seller_id} subaccount=${subaccount_code}`);

    // Update Paystack subaccount
    const res = await fetch(`https://api.paystack.co/subaccount/${subaccount_code}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settlement_bank,
        account_number,
      }),
    });

    const data = await res.json();
    console.log("[update-subaccount] Paystack response:", JSON.stringify(data));

    if (!data.status) {
      throw new Error(`Paystack update failed: ${data.message}`);
    }

    // Update payout_bank_code in profile too
    await supabase.from("profiles").update({
      payout_bank_code: settlement_bank,
    }).eq("id", seller_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[update-subaccount] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});