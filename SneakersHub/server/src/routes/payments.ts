import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { initializeTransaction } from "../lib/paystack.js";

const BOOST_FEE_MINOR = config.boostFee * 100; // GHS 5.00 -> 500
const ESCROW_DAYS = config.escrowDays;

export const payments = Router();

const boostSchema = z.object({ listing_id: z.string().uuid() });

// Create a Paystack transaction for a paid boost. The webhook applies the
// boost only after charge.success is verified.
payments.post("/boost/initialize", requireAuth, async (req, res, next) => {
  try {
    const { listing_id } = boostSchema.parse(req.body);
    const userId = req.user!.id;

    const { data: listing, error } = await supabase
      .from("listings")
      .select("id, name, seller_id")
      .eq("id", listing_id)
      .single();
    if (error || !listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const email = req.user!.email ?? "";
    if (!email) {
      res.status(400).json({ error: "Account has no email — add one to pay" });
      return;
    }

    const reference = `boost_${listing.id.slice(0, 8)}_${Date.now()}`;
    const { data: tx } = await initializeTransaction({
      email,
      amountKobo: BOOST_FEE_MINOR,
      reference,
      label: `Boost: ${listing.name}`,
      metadata: { kind: "boost", listing_id, user_id: userId },
    });

    res.json({ authorization_url: tx.authorization_url, access_code: tx.access_code, reference });
  } catch (err) {
    next(err);
  }
});

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        listing_id: z.string().uuid(),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .min(1),
  delivery_fee: z.number().min(0).default(0),
  delivery_method: z.string().optional(),
  delivery_label: z.string().optional(),
  delivery_estimated_cost: z.string().optional(),
  delivery_days: z.string().optional(),
  buyer_first_name: z.string().default(""),
  buyer_last_name: z.string().default(""),
  buyer_phone: z.string().default(""),
  buyer_address: z.string().default(""),
  buyer_city: z.string().default(""),
  buyer_region: z.string().default(""),
  promo_code: z.string().optional(),
});

// Single-seller checkout: creates the order + items, applies a promo code,
// then initializes Paystack. The webhook finalizes it as paid.
payments.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const input = orderSchema.parse(req.body);
    const buyerId = req.user!.id;

    const listingIds = [...new Set(input.items.map((i) => i.listing_id))];
    const { data: listings } = await supabase
      .from("listings")
      .select("id, seller_id, name, brand, image_url, price, status")
      .in("id", listingIds);
    if (!listings || listings.length !== listingIds.length) {
      res.status(400).json({ error: "One or more listings were not found" });
      return;
    }
    const byId = new Map(listings.map((l) => [l.id, l]));
    const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
    if (sellerIds.length !== 1) {
      res.status(400).json({ error: "Checkout supports one seller at a time" });
      return;
    }
    const sellerId = sellerIds[0];

    let discount = 0;
    if (input.promo_code) {
      const code = input.promo_code.trim().toUpperCase();
      const { data: promo } = await supabase
        .from("promo_codes")
        .select("id, discount_percent, uses, max_uses, active")
        .eq("code", code)
        .single();
      if (promo?.active && promo.uses < promo.max_uses) {
        discount = (promo.discount_percent ?? 0) / 100;
      }
    }

    let subtotal = 0;
    for (const item of input.items) {
      const l = byId.get(item.listing_id)!;
      if (l.status !== "active") {
        res.status(400).json({ error: `"${l.name}" is no longer available` });
        return;
      }
      subtotal += Number(l.price) * item.quantity;
    }

    const total = Math.max(0, Math.round((subtotal + input.delivery_fee) * (1 - discount) * 100) / 100);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: buyerId,
        seller_id: sellerId,
        subtotal,
        delivery_fee: input.delivery_fee,
        total,
        delivery_method: input.delivery_method,
        delivery_label: input.delivery_label,
        delivery_estimated_cost: input.delivery_estimated_cost,
        delivery_days: input.delivery_days,
        buyer_first_name: input.buyer_first_name,
        buyer_last_name: input.buyer_last_name,
        buyer_phone: input.buyer_phone,
        buyer_address: input.buyer_address,
        buyer_city: input.buyer_city,
        buyer_region: input.buyer_region,
        payout_status: "pending",
      })
      .select()
      .single();
    if (orderError || !order) throw orderError ?? new Error("Failed to create order");

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => {
        const l = byId.get(item.listing_id)!;
        return {
          order_id: order.id,
          listing_id: l.id,
          name: l.name,
          brand: l.brand,
          image_url: l.image_url,
          price: Number(l.price),
          quantity: item.quantity,
        };
      })
    );
    if (itemsError) throw itemsError;

    const email = req.user!.email ?? "";
    const reference = `order_${order.id.slice(0, 8)}_${Date.now()}`;
    const { data: tx } = await initializeTransaction({
      email,
      amountKobo: Math.round(total * 100),
      reference,
      label: `SneakersHub order #${order.id.slice(0, 8)}`,
      metadata: { kind: "order", order_id: order.id, user_id: buyerId },
    });

    res.json({ order, authorization_url: tx.authorization_url, reference });
  } catch (err) {
    next(err);
  }
});