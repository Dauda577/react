import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAYSTACK_SECRET      = Deno.env.get("PAYSTACK_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { user_id } = await req.json();
    if (!user_id) return new Response("Missing user_id", { status: 400 });

    console.log("[delete-account] Deleting account for user:", user_id);

    // ── Step 1: Fetch subaccount_code before deleting profile ──
    const { data: profile } = await adminClient
      .from("profiles")
      .select("subaccount_code, name")
      .eq("id", user_id)
      .single();

    // ── Step 2: Delete Paystack subaccount if one exists ──
    if (profile?.subaccount_code) {
      console.log("[delete-account] Deleting Paystack subaccount:", profile.subaccount_code);
      try {
        const res = await fetch(
          `https://api.paystack.co/subaccount/${profile.subaccount_code}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
          }
        );
        const data = await res.json();
        if (data.status) {
          console.log("[delete-account] Paystack subaccount deleted successfully");
        } else {
          // Non-fatal — log and continue. Subaccount may already be gone.
          console.warn("[delete-account] Paystack subaccount delete warning:", data.message);
        }
      } catch (paystackErr) {
        // Non-fatal — don't block account deletion if Paystack call fails
        console.warn("[delete-account] Paystack delete failed (non-fatal):", paystackErr);
      }
    }

    // ── Step 3: Delete profile ──
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileError) console.warn("[delete-account] Profile delete warning:", profileError.message);

    // ── Step 4: Delete listings ──
    await adminClient.from("listings").delete().eq("seller_id", user_id);

    // ── Step 5: Delete auth user ──
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) {
      console.error("[delete-account] Auth delete error:", error.message);
      throw error;
    }

    console.log("[delete-account] Account deleted successfully:", user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[delete-account] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});