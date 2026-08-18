import { Router } from "express";
import { config } from "../config.js";
import { supabase } from "../lib/supabase.js";
import { verifyWebhookSignature } from "../lib/paystack.js";

// Body is verified via express.raw() in index.ts — the raw buffer is the
// HMAC input, and the signature must match x-paystack-signature exactly.
export const webhooks = Router();

webhooks.post("/paystack", async (req, res) => {
  const rawBody = (req as any).rawBody;
  const signature = req.header("x-paystack-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body;
  if (!event?.event || event.event !== "charge.success") {
    res.json({ received: true, ignored: true });
    return;
  }

  const tx = event.data ?? {};
  const reference: string | undefined = tx.reference;
  const metadata: any = tx.metadata ?? {};
  if (!reference || !metadata?.kind) {
    res.json({ received: true, ignored: true });
    return;
  }

  try {
    if (metadata.kind === "boost") {
      // Idempotent: only mark boosted if not already boosted for the future.
      const { data: listing } = await supabase
        .from("listings")
        .select("id, boost_expires_at")
        .eq("id", metadata.listing_id)
        .single();
      const active = listing?.boost_expires_at && new Date(listing.boost_expires_at) > new Date();
      if (!listing || active) {
        res.json({ received: true, applied: false, reason: "noop" });
        return;
      }
      const boostExpires = new Date(Date.now() + config.boostDurationDays * 86_400_000).toISOString();
      await supabase
        .from("listings")
        .update({ boosted: true, boost_expires_at: boostExpires })
        .eq("id", metadata.listing_id);
      res.json({ received: true, applied: true });
    } else if (metadata.kind === "order") {
      // Idempotent: paystack_reference is unique; don't double-apply.
      const { data: order } = await supabase
        .from("orders")
        .select("id, paystack_reference, placed_at")
        .eq("id", metadata.order_id)
        .single();
      if (!order || order.paystack_reference) {
        res.json({ received: true, applied: false, reason: "noop" });
        return;
      }
      const releaseAt = new Date(
        new Date(order.placed_at ?? Date.now()).getTime() + config.escrowDays * 86_400_000
      ).toISOString();
      await supabase
        .from("orders")
        .update({
          paystack_reference: reference,
          payout_status: "pending",
          release_at: releaseAt,
          status: "pending",
        })
        .eq("id", metadata.order_id);
      res.json({ received: true, applied: true });
    } else {
      res.json({ received: true, ignored: true });
    }
  } catch (err: any) {
    console.error("[webhook:paystack]", err);
    // 500 so Paystack retries; do NOT mark the charge as handled.
    res.status(500).json({ error: err?.message ?? "Webhook handling failed" });
  }
});