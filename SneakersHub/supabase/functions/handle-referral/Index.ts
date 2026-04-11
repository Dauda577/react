import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL        = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ARKESEL_API_KEY     = Deno.env.get("ARKESEL_API_KEY")!;
const ARKESEL_SENDER_ID   = Deno.env.get("ARKESEL_SENDER_ID") || "SneakersHub";
const APP_URL             = "https://sneakershub.site";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Generate a promo code ─────────────────────────────────────────────────────
function genPromoCode(prefix: string) {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}${rand}`;
}

// ── Format phone for Arkesel ──────────────────────────────────────────────────
function formatPhone(phone: string): string | null {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0"))    n = "233" + n.slice(1);
  if (!n.startsWith("233")) n = "233" + n;
  return n.length === 12 ? n : null;
}

// ── Send SMS ──────────────────────────────────────────────────────────────────
async function sendSms(phone: string, message: string) {
  const formatted = formatPhone(phone);
  if (!formatted) return;
  await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": ARKESEL_API_KEY },
    body: JSON.stringify({ sender: ARKESEL_SENDER_ID, message, recipients: [formatted] }),
  });
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { referee_id, referral_code } = await req.json();

    if (!referee_id || !referral_code) {
      return new Response(JSON.stringify({ error: "Missing referee_id or referral_code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Find referrer by code ───────────────────────────────────────────────
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("id, name, phone, referral_count")
      .eq("referral_code", referral_code.toUpperCase().trim())
      .single();

    if (referrerError || !referrer) {
      return new Response(JSON.stringify({ error: "Invalid referral code" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Prevent self-referral ───────────────────────────────────────────────
    if (referrer.id === referee_id) {
      return new Response(JSON.stringify({ error: "You cannot refer yourself" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. Check referee hasn't already used a referral ────────────────────────
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referee_id", referee_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Referral already used" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 4. Create referral record ──────────────────────────────────────────────
    const { data: referral, error: referralError } = await supabase
      .from("referrals")
      .insert({
        referrer_id:   referrer.id,
        referee_id,
        referral_code: referral_code.toUpperCase().trim(),
        status:        "completed",
        completed_at:  new Date().toISOString(),
      })
      .select()
      .single();

    if (referralError) throw new Error("Failed to create referral: " + referralError.message);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // ── 5. Issue rewards ───────────────────────────────────────────────────────
    const referrerDiscount = genPromoCode("REF");
    const referrerBoost    = genPromoCode("BST");
    const refereeDiscount  = genPromoCode("NEW");

    await supabase.from("referral_rewards").insert([
      // Referrer: 15% discount
      {
        user_id:      referrer.id,
        referral_id:  referral.id,
        type:         "discount",
        discount_pct: 15,
        promo_code:   referrerDiscount,
        expires_at:   expiresAt,
      },
      // Referrer: free boost
      {
        user_id:      referrer.id,
        referral_id:  referral.id,
        type:         "free_boost",
        promo_code:   referrerBoost,
        expires_at:   expiresAt,
      },
      // Referee: 15% off first purchase
      {
        user_id:      referee_id,
        referral_id:  referral.id,
        type:         "discount",
        discount_pct: 15,
        promo_code:   refereeDiscount,
        expires_at:   expiresAt,
      },
    ]);

    // ── 6. Increment referrer's referral count ─────────────────────────────────
    await supabase
      .from("profiles")
      .update({ referral_count: (referrer.referral_count ?? 0) + 1 })
      .eq("id", referrer.id);

    // ── 7. SMS referrer ────────────────────────────────────────────────────────
    if (referrer.phone) {
      await sendSms(
        referrer.phone,
        `🎉 Someone just signed up using your SneakersHub referral code! You've earned a 15% discount (${referrerDiscount}) and a free listing boost (${referrerBoost}). Both expire in 7 days. Use them at ${APP_URL}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        referee_reward: { promo_code: refereeDiscount, discount_pct: 15, expires_at: expiresAt },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("handle-referral error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});