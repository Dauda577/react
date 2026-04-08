import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { account_number, bank_code } = body;

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ success: false, error: "account_number and bank_code are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Format the account number correctly
    let formattedNumber = account_number.replace(/\D/g, "");
    
    // Paystack expects MoMo numbers in 0XXXXXXXXX format (10 digits with leading 0)
    if (formattedNumber.startsWith("233")) {
      formattedNumber = "0" + formattedNumber.slice(3);
    }
    if (!formattedNumber.startsWith("0")) {
      formattedNumber = "0" + formattedNumber;
    }
    // Ensure it's exactly 10 digits
    if (formattedNumber.length > 10) {
      formattedNumber = formattedNumber.slice(0, 10);
    }

    console.log(`Resolving account: ${formattedNumber} on ${bank_code}`);

    // Map bank codes correctly
    let paystackBankCode = bank_code;
    if (bank_code === "VOD") paystackBankCode = "VOD";
    if (bank_code === "ATL") paystackBankCode = "ATL";
    if (bank_code === "MTN") paystackBankCode = "MTN";

    // Call Paystack's resolve account endpoint
    const response = await fetch("https://api.paystack.co/bank/resolve", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        account_number: formattedNumber,
        bank_code: paystackBankCode,
      }),
    });

    const data = await response.json();
    console.log("Paystack response:", JSON.stringify(data));

    if (!data.status) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: data.message || "Account not found. Please verify the number is correct." 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        account_name: data.data.account_name,
        account_number: data.data.account_number,
        bank_code: bank_code,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});