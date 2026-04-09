import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const getPaystackBankCode = (network: string): string => {
  const bankCodes: Record<string, string> = {
    "MTN": "MTN", "VOD": "VOD", "ATL": "ATL",
    "mtn": "MTN", "vod": "VOD", "atl": "ATL",
  };
  return bankCodes[network] || network;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!PAYSTACK_SECRET) {
      console.error("PAYSTACK_SECRET_KEY is not set");
      return new Response(
        JSON.stringify({ success: false, error: "Payment system not configured. Please contact support." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { account_number, bank_code } = body;
    console.log("Request body:", { account_number, bank_code });

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ success: false, error: "Account number and bank code are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Normalize number to 0XXXXXXXXX format ─────────────────────────────────
    let formattedNumber = account_number.replace(/\D/g, "");
    if (formattedNumber.startsWith("233")) formattedNumber = formattedNumber.slice(3);
    if (!formattedNumber.startsWith("0")) formattedNumber = "0" + formattedNumber;
    if (formattedNumber.length > 10) formattedNumber = formattedNumber.slice(0, 10);

    console.log("Formatted number:", formattedNumber);

    // ✅ Validate length after formatting
    if (formattedNumber.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid account number length" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paystackBankCode = getPaystackBankCode(bank_code);
    console.log(`Resolving: ${formattedNumber} bank_code: ${paystackBankCode}`);

    // ✅ GET request with query params — correct Paystack API usage
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${formattedNumber}&bank_code=${paystackBankCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
        },
      }
    );

    const data = await response.json();
    console.log("Paystack response:", JSON.stringify(data));

    if (!data.status) {
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Account not found. Please verify the number is correct." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        account_name: data.data.account_name,
        account_number: data.data.account_number,
        bank_code,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in resolve-account:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error. Please try again." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});