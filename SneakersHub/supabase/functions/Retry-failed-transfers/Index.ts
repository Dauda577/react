import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Find orders where transfer failed and haven't exceeded 3 attempts
  const { data: failedOrders, error } = await supabase
    .from("orders")
    .select("id, seller_id, total, transfer_attempts, transfer_failure_reason")
    .eq("payout_status", "transfer_failed")
    .lt("transfer_attempts", 3) // max 3 attempts
    .eq("payout_status", "transfer_failed");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!failedOrders || failedOrders.length === 0) {
    return new Response(JSON.stringify({ message: "No failed transfers to retry", retried: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[retry-failed-transfers] Found ${failedOrders.length} orders to retry`);

  let retried = 0;
  let stillFailed = 0;

  for (const order of failedOrders) {
    try {
      // Reset to pending so release-payment will process it
      await supabase.from("orders").update({
        payout_status: "pending",
        transfer_failure_reason: null,
        transfer_failed_at: null,
      }).eq("id", order.id);

      // Call release-payment
      const result = await supabase.functions.invoke("release-payment", {
        body: { order_id: order.id, trigger: "retry" },
      });

      if (result.error) {
        console.error(`Retry failed for order ${order.id}:`, result.error);
        stillFailed++;
      } else {
        console.log(`Retry succeeded for order ${order.id}`);
        retried++;
      }

      // Small delay between retries
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(`Retry error for order ${order.id}:`, e);
      stillFailed++;
    }
  }

  // Alert admin with summary
  try {
    const { data: admin } = await supabase.from("profiles").select("phone").eq("is_official", true).single();
    if (admin?.phone) {
      await supabase.functions.invoke("send-sms", {
        body: {
          type: "admin.alert",
          record: {
            phone: admin.phone,
            message: `SneakersHub retry: ${retried} transfer(s) retried successfully, ${stillFailed} still failing. Check /admin for details.`,
          },
        },
      });
    }
  } catch (e) { console.warn("Admin SMS failed:", e); }

  return new Response(JSON.stringify({ retried, stillFailed, total: failedOrders.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});