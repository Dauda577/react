import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map our network codes to Paystack's expected bank codes
const getPaystackBankCode = (network: string): string => {
  const bankCodes: Record<string, string> = {
    "MTN": "MTN",
    "VOD": "VOD", 
    "ATL": "ATL",
    "vod": "VOD",
    "mtn": "MTN", 
    "atl": "ATL"
  };
  return bankCodes[network] || network;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Check if Paystack secret is configured
    if (!PAYSTACK_SECRET) {
      console.error("PAYSTACK_SECRET_KEY is not set");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment system not configured. Please contact support." 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { account_number, bank_code } = body;

    console.log("Request body:", { account_number, bank_code });

    if (!account_number || !bank_code) {
      return new Response(
        JSON.stringify({ success: false, error: "Account number and bank code are required" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Format the account number correctly for Paystack
    let formattedNumber = account_number.replace(/\D/g, "");
    console.log("Raw formatted number:", formattedNumber);
    
    
    if (formattedNumber.startsWith("233")) {
      formattedNumber = formattedNumber.slice(3);
      console.log("After removing 233:", formattedNumber);
    }

    if (!formattedNumber.startsWith("0")) {
      formattedNumber = "0" + formattedNumber;
      console.log("After adding leading 0:", formattedNumber);
    }
   
    if (formattedNumber.length > 10) {
      formattedNumber = formattedNumber.slice(0, 10);
      console.log("After truncating:", formattedNumber);
    }

    const paystackBankCode = getPaystackBankCode(bank_code);
    console.log(`Resolving account: ${formattedNumber} on bank_code: ${bank_code} -> Paystack code: ${paystackBankCode}`);

    
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
    console.error("Error in resolve-account:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error. Please try again." 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});