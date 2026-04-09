import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

serve(async (req: Request) => {
  // Verify auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_official")
    .eq("id", user.id)
    .single();

  if (!profile?.is_official) {
    return new Response(JSON.stringify({ error: "Admin only" }), { status: 403 });
  }

  try {
    // Fetch all verified sellers with subaccount codes
    const { data: sellers, error: sellersError } = await supabase
      .from("profiles")
      .select("id, name, subaccount_code, verified")
      .eq("verified", true)
      .not("subaccount_code", "is", null);

    if (sellersError) throw sellersError;

    const results = [];

    for (const seller of sellers) {
      try {
        // Fetch subaccount details from Paystack
        const response = await fetch(
          `https://api.paystack.co/subaccount/${seller.subaccount_code}`,
          {
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          results.push({
            seller_id: seller.id,
            seller_name: seller.name,
            subaccount_code: seller.subaccount_code,
            is_verified: false,
            settlement_schedule: null,
            error: data.message || "Failed to fetch subaccount",
          });
          continue;
        }

        const subaccount = data.data;
        
        results.push({
          seller_id: seller.id,
          seller_name: seller.name,
          subaccount_code: seller.subaccount_code,
          is_verified: subaccount.active && subaccount.is_verified,
          settlement_schedule: subaccount.settlement_schedule || null,
          account_name: subaccount.account_name,
          bank: subaccount.settlement_bank,
          account_number: subaccount.account_number,
          error: null,
        });

      } catch (error: any) {
        results.push({
          seller_id: seller.id,
          seller_name: seller.name,
          subaccount_code: seller.subaccount_code,
          is_verified: false,
          settlement_schedule: null,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        total: results.length,
        verified_count: results.filter(r => r.is_verified).length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error checking subaccount statuses:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});