import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET      = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: verify the caller is an admin ───────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized — missing auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_official")
      .eq("id", user.id)
      .single();

    if (!profile?.is_official) {
      return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch verified sellers with subaccount codes ──────────────────────────
    const { data: sellers, error: sellersError } = await supabase
      .from("profiles")
      .select("id, name, phone, subaccount_code, verified, is_official")
      .eq("verified", true)
      .not("subaccount_code", "is", null)
      .order("name");

    if (sellersError) {
      throw new Error(`Failed to fetch sellers: ${sellersError.message}`);
    }

    if (!sellers || sellers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        total: 0,
        verified_count: 0,
        message: "No verified sellers with subaccount codes found",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check each subaccount with Paystack ───────────────────────────────────
    const results = [];

    for (const seller of sellers) {
      try {
        const response = await fetch(
          `https://api.paystack.co/subaccount/${seller.subaccount_code}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${PAYSTACK_SECRET}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.status) {
          results.push({
            seller_id: seller.id,
            seller_name: seller.name,
            seller_phone: seller.phone,
            subaccount_code: seller.subaccount_code,
            is_verified: false,
            settlement_schedule: null,
            account_name: null,
            bank: null,
            account_number: null,
            error: data.message || "Failed to fetch subaccount from Paystack",
            checked_at: new Date().toISOString(),
          });
          continue;
        }

        const subaccount = data.data;
        
        results.push({
          seller_id: seller.id,
          seller_name: seller.name,
          seller_phone: seller.phone,
          subaccount_code: seller.subaccount_code,
          is_verified: subaccount.active === true && subaccount.is_verified === true,
          settlement_schedule: subaccount.settlement_schedule || null,
          account_name: subaccount.account_name || null,
          bank: subaccount.settlement_bank || null,
          account_number: subaccount.account_number || null,
          primary_contact_email: subaccount.primary_contact_email || null,
          primary_contact_name: subaccount.primary_contact_name || null,
          percentage_charge: subaccount.percentage_charge || null,
          error: null,
          checked_at: new Date().toISOString(),
        });

      } catch (error: any) {
        console.error(`Failed to check subaccount for seller ${seller.id}:`, error);
        results.push({
          seller_id: seller.id,
          seller_name: seller.name,
          seller_phone: seller.phone,
          subaccount_code: seller.subaccount_code,
          is_verified: false,
          settlement_schedule: null,
          account_name: null,
          bank: null,
          account_number: null,
          error: error.message || "Network or parsing error",
          checked_at: new Date().toISOString(),
        });
      }
    }

    // ── Return summary ────────────────────────────────────────────────────────
    const verifiedCount = results.filter(r => r.is_verified).length;
    const unverifiedCount = results.length - verifiedCount;

    return new Response(JSON.stringify({
      success: true,
      data: results,
      total: results.length,
      verified_count: verifiedCount,
      unverified_count: unverifiedCount,
      summary: {
        verified: verifiedCount,
        unverified: unverifiedCount,
        issues: results.filter(r => r.error).length,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[check-subaccount-status] Error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});