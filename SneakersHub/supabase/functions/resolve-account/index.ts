import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { account_number, bank_code } = await req.json();

    if (!account_number || !bank_code) {
      throw new Error("account_number and bank_code are required");
    }

    // Format the account number correctly
    let formattedNumber = account_number.replace(/\D/g, "");
    // Ensure it starts with 0 for Paystack's MoMo resolution
    if (formattedNumber.startsWith("233")) {
      formattedNumber = "0" + formattedNumber.slice(3);
    }
    if (!formattedNumber.startsWith("0")) {
      formattedNumber = "0" + formattedNumber;
    }

    console.log(`Resolving account: ${formattedNumber} on ${bank_code}`);

    // Call Paystack's resolve account endpoint
    const response = await fetch("https://api.paystack.co/bank/resolve", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number: formattedNumber,
        bank_code: bank_code,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error("Paystack resolve error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.message || "Account not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        account_name: data.data.account_name,
        account_number: data.data.account_number,
        bank_code: bank_code,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});