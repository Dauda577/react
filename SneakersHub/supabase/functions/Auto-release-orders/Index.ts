import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = new Date().toISOString();

    // Find all orders past their release_at date that are still pending
    const { data: overdueOrders, error } = await supabase
      .from("orders")
      .select("id, seller_id, total, buyer_id")
      .eq("payout_status", "pending")
      .eq("seller_confirmed", true)
      .not("release_at", "is", null)
      .lt("release_at", now);

    if (error) throw new Error("Failed to fetch overdue orders: " + error.message);

    console.log(`Found ${overdueOrders?.length ?? 0} overdue orders to auto-release`);

    let released = 0;
    let failed = 0;

    for (const order of (overdueOrders ?? [])) {
      try {
        // Trigger the release-payment function for each order
        const { error: releaseError } = await supabase.functions.invoke("release-payment", {
          body: { order_id: order.id, trigger: "auto" },
        });

        if (releaseError) throw releaseError;
        released++;
        console.log(`Auto-released order ${order.id}`);
      } catch (err) {
        console.warn(`Failed to auto-release order ${order.id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ success: true, released, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Auto-release error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});