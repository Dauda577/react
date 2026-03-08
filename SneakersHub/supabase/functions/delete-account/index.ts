import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user_id from request body
    const { user_id } = await req.json();
    if (!user_id) return new Response("Missing user_id", { status: 400 });

    console.log("Deleting account for user:", user_id);

    // Delete profile first (so fetchProfile returns null on next login)
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profileError) console.warn("Profile delete warning:", profileError.message);

    // Also clear any listings
    await adminClient.from("listings").delete().eq("seller_id", user_id);

    // Delete the auth user
    const { error } = await adminClient.auth.admin.deleteUser(user_id);
    if (error) {
      console.error("Delete error:", error.message);
      throw error;
    }

    console.log("Account deleted successfully:", user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});