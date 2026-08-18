import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const referrals = Router();

const applySchema = z.object({
  referee_id: z.string().uuid(),
  referral_code: z.string().trim().min(1),
});

function randomCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// Applies a referral code, creating a 15% promo code for the referee.
// Response shape matches the old handle-referral edge function.
referrals.post("/apply", requireAuth, async (req, res, next) => {
  try {
    const { referee_id, referral_code } = applySchema.parse(req.body);

    const { data: referral } = await supabase
      .from("referrals")
      .select("id, code, uses, max_uses, active")
      .eq("code", referral_code)
      .single();

    if (!referral || !referral.active) {
      res.status(404).json({ success: false, error: "Invalid referral code" });
      return;
    }
    if (referral.uses >= referral.max_uses) {
      res.status(400).json({ success: false, error: "This referral code has reached its limit" });
      return;
    }

    // A referee can only claim once.
    const { data: existing } = await supabase
      .from("promo_codes")
      .select("id")
      .eq("owner_id", referee_id)
      .eq("source", "referral")
      .maybeSingle();
    if (existing) {
      res.status(400).json({ success: false, error: "Referral already used" });
      return;
    }

    const promoCode = randomCode();
    const { data: promo, error: promoError } = await supabase
      .from("promo_codes")
      .insert({
        code: promoCode,
        discount_percent: 15,
        max_uses: 1,
        active: true,
        owner_id: referee_id,
        source: "referral",
      })
      .select()
      .single();
    if (promoError || !promo) throw promoError ?? new Error("Failed to create promo code");

    await supabase
      .from("referrals")
      .update({
        uses: referral.uses + 1,
        referee_id,
      })
      .eq("id", referral.id);

    res.json({ success: true, referee_reward: { promo_code: promo.code } });
  } catch (err) {
    next(err);
  }
});