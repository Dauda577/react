import { Router } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { sendSms } from "../lib/sms.js";
import { sendPush } from "../lib/push.js";
import { paystackGet, paystackPost } from "../lib/paystack.js";

export const admin = Router();
admin.use(requireAuth, requireAdmin);

// ── GET /api/admin/data ──────────────────────────────────────────────────────
// Raw array of orders with nested seller { name, phone, is_official } — the
// exact shape the Admin page maps over.
admin.get("/data", async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, seller:profiles!orders_seller_id_fkey(name, phone, is_official)")
      .order("placed_at", { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/refund ───────────────────────────────────────────────────
const refundSchema = z.object({
  order_id: z.string().uuid(),
  paystack_reference: z.string().optional(),
  reason: z.string().optional(),
  buyer_phone: z.string().optional(),
  seller_phone: z.string().optional(),
});

admin.post("/refund", async (req, res, next) => {
  try {
    const input = refundSchema.parse(req.body);

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, paystack_reference, total")
      .eq("id", input.order_id)
      .single();
    if (error || !order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.paystack_reference) {
      // Initiate a Paystack refund (test mode supports it).
      const refundRes = await paystackPost("/transaction/refund", {
        transaction: order.paystack_reference,
        amount: Math.round(Number(order.total) * 100),
      });
      if (!refundRes.ok) {
        const body = (await refundRes.json().catch(() => ({}))) as any;
        res.status(502).json({ error: body?.message ?? "Paystack refund failed" });
        return;
      }
    }

    await supabase
      .from("orders")
      .update({
        payout_status: "refunded",
        dispute_reason: input.reason ?? null,
        transfer_failure_reason: null,
      })
      .eq("id", input.order_id);

    if (input.buyer_phone) {
      await sendSms(
        input.buyer_phone,
        "Your refund is being processed and should reach you within 5-10 business days. - SneakersHub"
      );
    }
    if (input.seller_phone) {
      await sendSms(
        input.seller_phone,
        "An order was refunded. The escrowed payout for that order has been cancelled. - SneakersHub"
      );
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/paystack-status ──────────────────────────────────────────
// Returns subaccounts keyed so the admin UI can flag missing/unverified ones.
admin.get("/paystack-status", async (_req, res, next) => {
  try {
    const accountsRes = await paystackGet("/subaccount");
    if (!accountsRes.ok) {
      res.status(502).json({ error: "Paystack subaccounts unavailable", data: [] });
      return;
    }
    const body = (await accountsRes.json()) as any;
    const data = (body?.data ?? []).map((sub: any) => ({
      seller_id: sub?.metadata ?? null,
      subaccount_code: sub?.subaccount_code,
      business_name: sub?.business_name,
      active: sub?.active ?? true,
      settlement_schedule: sub?.settlement_schedule,
    }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/applications/:id/action ─────────────────────────────────
// approve/reject: updates DB, notifies via SMS (record.message) + push.
const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  message: z.string().optional(),
});

admin.post("/applications/:id/action", async (req, res, next) => {
  try {
    const { action } = actionSchema.parse(req.body);
    const appId = req.params.id;

    const { data: app } = await supabase
      .from("seller_applications")
      .select("*")
      .eq("id", appId)
      .single();
    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    await supabase
      .from("seller_applications")
      .update({ status: newStatus, reviewed_at: new Date().toISOString() })
      .eq("id", appId);

    if (action === "approve") {
      await supabase
        .from("profiles")
        .update({ is_seller: true, role: "seller" })
        .eq("id", app.user_id);
    }

    const message =
      action === "approve"
        ? `Congratulations! Your seller application has been approved. Pay the GH₵ 50 verification fee to start selling. Tap here: https://sneakershub.site/account?tab=settings`
        : `Your seller application was not approved. You can re-apply anytime. Tap here: https://sneakershub.site/account`;

    if (app.phone) {
      await sendSms(app.phone, message);
    }
    await sendPush({
      user_id: app.user_id,
      title: action === "approve" ? "Application Approved!" : "Application Update",
      body:
        action === "approve"
          ? `Your store "${app.store_name}" is approved! Pay the GH₵ 50 fee to activate your seller account.`
          : `Your application for "${app.store_name}" was not approved. You can re-apply.`,
      url: "/account?tab=settings",
    });

    res.json({ success: true, status: newStatus });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/promo-codes ──────────────────────────────────────────────
// Generate one or more promo codes. Writes go through the service-role server
// because promo_codes has no client insert policy.
const promoCreateSchema = z.object({
  prefix: z.string().trim().max(8).optional(),
  length: z.number().int().min(4).max(12).default(8),
  count: z.number().int().min(1).max(100).default(1),
  discount_percent: z.number().int().min(1).max(90).default(15),
  max_uses: z.number().int().min(1).max(1000).default(1),
  owner_id: z.string().uuid().nullish(),
});

const generatePromoCode = (prefix: string, length: number): string => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  const chars = Array.from({ length }, () =>
    alphabet[Math.floor(Math.random() * alphabet.length)]
  );
  const core = chars.join("");
  return prefix ? `${prefix}-${core}` : core;
};

admin.post("/promo-codes", async (req, res, next) => {
  try {
    const input = promoCreateSchema.parse(req.body);
    const codes = Array.from({ length: input.count }, () =>
      generatePromoCode(input.prefix ?? "", input.length)
    );

    const { data, error } = await supabase
      .from("promo_codes")
      .insert(
        codes.map((code) => ({
          code,
          discount_percent: input.discount_percent,
          max_uses: input.max_uses,
          owner_id: input.owner_id ?? null,
          source: "admin",
        }))
      )
      .select("code");

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ codes: (data ?? []).map((d) => d.code) });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/promo-codes/:id ─────────────────────────────────────────
const promoUpdateSchema = z.object({
  discount_percent: z.number().int().min(1).max(90).optional(),
  max_uses: z.number().int().min(1).max(1000).optional(),
  active: z.boolean().optional(),
});

admin.patch("/promo-codes/:id", async (req, res, next) => {
  try {
    const input = promoUpdateSchema.parse(req.body);
    const { error } = await supabase
      .from("promo_codes")
      .update(input)
      .eq("id", req.params.id);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/promo-codes/:id ────────────────────────────────────────
admin.delete("/promo-codes/:id", async (req, res, next) => {
  try {
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", req.params.id);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/broadcast-sms ────────────────────────────────────────────
// Fan an SMS out to a set of recipient user ids. Profiles lacking a phone are
// skipped. Returns sent/failed counts (each sendSms call is one recipient).
const broadcastSchema = z.object({
  message: z.string().trim().min(1).max(1600),
  recipient_ids: z.array(z.string().uuid()).min(1).max(500),
});

admin.post("/broadcast-sms", async (req, res, next) => {
  try {
    const { message, recipient_ids } = broadcastSchema.parse(req.body);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, phone")
      .in("id", recipient_ids);

    const phones = (profiles ?? [])
      .map((p) => p.phone as string | null)
      .filter((p): p is string => Boolean(p));

    if (phones.length === 0) {
      res.status(400).json({ error: "No recipients have a phone number" });
      return;
    }

    let sent = 0;
    let failed = 0;
    for (const phone of phones) {
      const result = await sendSms(phone, message);
      if (result.ok) sent++;
      else failed++;
    }

    res.json({ sent, failed });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/retry-transfers ─────────────────────────────────────────
admin.post("/retry-transfers", async (_req, res, next) => {
  try {
    const { data: failed } = await supabase
      .from("orders")
      .select("id, transfer_attempts")
      .eq("payout_status", "transfer_failed");

    const orders = failed ?? [];
    if (orders.length === 0) {
      res.json({ retried: 0 });
      return;
    }

    for (const order of orders) {
      await supabase
        .from("orders")
        .update({
          payout_status: "pending",
          transfer_failure_reason: null,
          transfer_attempts: (order.transfer_attempts ?? 0) + 1,
        })
        .eq("id", order.id);
    }

    res.json({ retried: orders.length });
  } catch (err) {
    next(err);
  }
});