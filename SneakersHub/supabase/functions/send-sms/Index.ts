// supabase/functions/send-sms/index.ts
// Deploy with: npx supabase functions deploy send-sms

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_API_KEY = Deno.env.get("ARKESEL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Send SMS via Arkesel ─────────────────────────────────────────────────────
async function sendSMS(to: string, message: string) {
  // Normalize phone: strip leading 0, add +233
  let phone = to.replace(/\s+/g, "").replace(/^0/, "");
  if (!phone.startsWith("+")) phone = `+233${phone}`;

  const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: {
      "api-key": ARKESEL_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: "SneakersHub",
      message,
      recipients: [phone],
    }),
  });

  const data = await res.json();
  console.log("Arkesel response:", JSON.stringify(data));
  return data;
}

// ── Get phone number from profiles ──────────────────────────────────────────
async function getPhone(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .single();
  return data?.phone ?? null;
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json();
  const { type, record } = body;

  try {
    // ── New order placed → notify seller ──────────────────────────────────
    if (type === "order.created") {
      const order = record;
      const sellerPhone = await getPhone(order.seller_id);
      if (sellerPhone) {
        await sendSMS(
          sellerPhone,
          `SneakersHub: New order received! Order ${formatOrderId(order.id)} worth GHS ${order.total}. Open the app to confirm. sneakershub-sigma.vercel.app/account`
        );
      }
    }

    // ── Order shipped → notify buyer ──────────────────────────────────────
    if (type === "order.shipped") {
      const order = record;
      const buyerPhone = order.buyer?.phone ?? await getPhone(order.buyer_id);
      if (buyerPhone) {
        await sendSMS(
          buyerPhone,
          `SneakersHub: Your order ${formatOrderId(order.id)} has been shipped! It's on its way to you. Track it at sneakershub-sigma.vercel.app/account`
        );
      }
    }

    // ── Order delivered → notify buyer ────────────────────────────────────
    if (type === "order.delivered") {
      const order = record;
      const buyerPhone = order.buyer?.phone ?? await getPhone(order.buyer_id);
      if (buyerPhone) {
        await sendSMS(
          buyerPhone,
          `SneakersHub: Your order ${formatOrderId(order.id)} has been delivered! Enjoy your kicks. Leave a review at sneakershub-sigma.vercel.app/account`
        );
      }
    }

    // ── New message → notify receiver ─────────────────────────────────────
    if (type === "message.created") {
      const message = record;
      const receiverPhone = await getPhone(message.receiver_id);
      if (receiverPhone) {
        const preview = message.content.length > 50
          ? message.content.slice(0, 50) + "..."
          : message.content;
        await sendSMS(
          receiverPhone,
          `SneakersHub: New message: "${preview}". Reply at sneakershub-sigma.vercel.app/account`
        );
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("SMS error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatOrderId(id: string) {
  const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
  return `#${num.toString().padStart(9, "0")}`;
}