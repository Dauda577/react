import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ARKESEL_API_KEY      = Deno.env.get("ARKESEL_API_KEY")!;
const ARKESEL_SENDER_ID    = Deno.env.get("ARKESEL_SENDER_ID") || "SneakersHub";
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL              = "https://sneakershub.site";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhone(phone: string): string | null {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0"))    n = "233" + n.slice(1);
  if (!n.startsWith("233")) n = "233" + n;
  return n.length === 12 ? n : null;
}

async function sendSms(phone: string, message: string) {
  const formatted = formatPhone(phone);
  if (!formatted) return;
  await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": ARKESEL_API_KEY },
    body: JSON.stringify({ 
      sender: ARKESEL_SENDER_ID, 
      message, 
      recipients: [formatted] 
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") 
    return new Response("ok", { headers: corsHeaders });

  try {
    const { listing_id, new_price } = await req.json();

    if (!listing_id || new_price === undefined) {
      return new Response(JSON.stringify({ error: "Missing listing_id or new_price" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Find all users who saved this listing at a higher price ──────────
    const { data: savedRows } = await supabase
      .from("saved_listings")
      .select(`
        user_id,
        saved_price,
        listing_id,
        profiles ( name, phone ),
        listings ( name, image_url )
      `)
      .eq("listing_id", listing_id)
      .gt("saved_price", new_price); // only notify if price dropped

    if (!savedRows || savedRows.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Get listing name for notifications ───────────────────────────────
    const listingName = (savedRows[0] as any).listings?.name ?? "A saved item";
    const listingImage = (savedRows[0] as any).listings?.image_url ?? null;

    let notified = 0;

    for (const row of savedRows as any[]) {
      const userId   = row.user_id;
      const profile  = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const oldPrice = row.saved_price;
      const saved    = Math.round(oldPrice - new_price);

      // ── 3. Send push notification ────────────────────────────────────────
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", userId);

      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              subscription: sub.subscription,
              title: "💰 Price Drop Alert!",
              body: `${listingName} dropped from GHS ${oldPrice} to GHS ${new_price} — save GHS ${saved}!`,
              url: `/product/${listing_id}`,
              icon: listingImage ?? "/icon-192.png",
              badge: "/badge-72.png",
              data: { listing_id, new_price, old_price: oldPrice },
            }),
          }).catch(() => {});
        }
      }

      // ── 4. Send SMS ──────────────────────────────────────────────────────
      if (profile?.phone) {
        await sendSms(
          profile.phone,
          `💰 Price Drop! ${listingName} you saved on SneakersHub dropped from GHS ${oldPrice} to GHS ${new_price}. Save GHS ${saved}! View it here: ${APP_URL}/product/${listing_id}`
        );
      }

      // ── 5. Update saved_price to new price so they don't get notified again
      await supabase
        .from("saved_listings")
        .update({ saved_price: new_price })
        .eq("user_id", userId)
        .eq("listing_id", listing_id);

      notified++;
    }

    return new Response(JSON.stringify({ success: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("price-drop-alert error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});