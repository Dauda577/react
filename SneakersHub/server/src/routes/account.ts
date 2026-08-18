import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";

export const account = Router();

// DELETE /api/account — permanently deletes the auth user (cascades to
// profile/listings/etc. via FK on delete cascade).
account.delete("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});