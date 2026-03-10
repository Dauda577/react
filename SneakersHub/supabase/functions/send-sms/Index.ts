import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_API_KEY = Deno.env.get("ARKESEL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Fetch the official account's phone number to notify admin
async function getAdminPhone(): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("phone")
    .eq("is_official", true)
    .single();
  return data?.phone ?? null;
}

async function getPhone(userId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("phone").eq("id", userId).single();
  return data?.phone ?? null;
}

async function sendSMS(to: string, message: string) {
  let phone = to.replace(/\s+/g, "").replace(/^\+/, "").replace(/^233/, "").replace(/^0/, "");
  phone = `233${phone}`;
  console.log("Sending to:", phone);
  const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "SneakersHub", message, recipients: [phone] }),
  });
  const data = await res.json();
  console.log("Arkesel response:", JSON.stringify(data));
  return data;
}

function formatOrderId(id: string) {
  const num = parseInt(id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
  return `#${num.toString().padStart(9, "0")}`;
}

// Summarise order items for SMS e.g. "Nike Air Max 90 (x1), Jordan 1 (x2)"
function formatItems(items: any[]): string {
  if (!items || items.length === 0) return "your order";
  const parts = items.map((i: any) => {
    const qty = i.quantity > 1 ? ` (x${i.quantity})` : "";
    return `${i.name}${qty}`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts.join(" & ");
  return `${parts[0]} + ${parts.length - 1} more`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, record } = await req.json();
    console.log("Event type:", type, "Record:", JSON.stringify(record));

    if (type === "order.created") {
      const phone = await getPhone(record.seller_id);
      if (phone) {
        const items = formatItems(record.items);
        await sendSMS(phone,
          `SneakersHub: New order ${formatOrderId(record.id)} — ${items} — GHS ${record.total}. Open app to confirm & dispatch. sneakershub-sigma.vercel.app/account`
        );
      }
    }

    if (type === "order.shipped") {
      const phone = record.buyer?.phone ?? await getPhone(record.buyer_id);
      if (phone) {
        const items = formatItems(record.items);
        const releaseDate = record.release_at
          ? new Date(record.release_at).toLocaleDateString("en-GH", { day: "numeric", month: "short" })
          : null;
        const deadline = releaseDate ? ` Confirm receipt by ${releaseDate} or raise a dispute.` : "";
        await sendSMS(phone,
          `SneakersHub: Order ${formatOrderId(record.id)} dispatched! ${items} — GHS ${record.total}.${deadline} sneakershub-sigma.vercel.app/account`
        );
      }
    }

    if (type === "order.delivered") {
      const phone = record.buyer?.phone ?? await getPhone(record.buyer_id);
      if (phone) {
        const items = formatItems(record.items);
        await sendSMS(phone,
          `SneakersHub: Order ${formatOrderId(record.id)} confirmed! ${items} — GHS ${record.total}. Enjoy your kicks! 👟 sneakershub-sigma.vercel.app/account`
        );
      }
    }

    if (type === "message.created") {
      const phone = await getPhone(record.receiver_id);
      if (phone) {
        const preview = record.content?.length > 50
          ? record.content.slice(0, 50) + "..."
          : record.content;
        await sendSMS(phone,
          `SneakersHub: New message: "${preview}". Reply at sneakershub-sigma.vercel.app/account`
        );
      }
    }

    if (type === "order.dispute_reminder") {
      const phone = await getPhone(record.buyer_id);
      if (phone) {
        const urgent = record.days_left <= 1 ? "⚠️ LAST CHANCE: " : "Reminder: ";
        const when = record.days_left <= 1 ? "today" : `in ${record.days_left} day${record.days_left === 1 ? "" : "s"}`;
        const total = record.total ? ` (GHS ${record.total})` : "";
        await sendSMS(phone,
          `SneakersHub: ${urgent}Order ${formatOrderId(record.order_id)}${total} — payment auto-releases to seller ${when}. Confirm receipt or dispute: sneakershub-sigma.vercel.app/account`
        );
      }
    }

    if (type === "payout.missing_details") {
      // Verified seller hasn't added payout details — funds are being held
      const phone = record.seller_phone ?? await getPhone(record.seller_id);
      if (phone) await sendSMS(phone,
        `SneakersHub: You have a pending payout for order ${formatOrderId(record.order_id)} but no payout details set. Add your MoMo number in Settings to receive your payment: sneakershub-sigma.vercel.app/account`
      );
    }

    if (type === "payout.released") {
      const phone = await getPhone(record.seller_id);
      if (phone) {
        const trigger = record.trigger === "auto" ? "auto-released after 3 days" : "released";
        await sendSMS(phone,
          `SneakersHub: GHS ${record.amount} payout ${trigger} for order ${formatOrderId(record.order_id)} (sale total GHS ${record.order_total ?? record.amount}). Check your ${record.payout_method ?? "account"}. sneakershub-sigma.vercel.app`
        );
      }
    }

    if (type === "order.dispute_raised") {
      // SMS the admin (official account) about the new dispute
      const adminPhone = await getAdminPhone();
      if (adminPhone) {
        const items = formatItems(record.items);
        await sendSMS(adminPhone,
          `⚠️ SneakersHub DISPUTE: Order ${formatOrderId(record.order_id)} — ${items} — GHS ${record.total}. Reason: "${record.reason?.slice(0, 80)}". Review at sneakershub-sigma.vercel.app/admin`
        );
      }

      // Also SMS the buyer to confirm their dispute was received
      const buyerPhone = await getPhone(record.buyer_id);
      if (buyerPhone) {
        await sendSMS(buyerPhone,
          `SneakersHub: Your dispute for order ${formatOrderId(record.order_id)} has been received. Payment is frozen. We'll review and contact you within 24hrs. sneakershub-sigma.vercel.app/account`
        );
      }
    }

    if (type === "admin.alert") {
      // Direct alert to admin phone
      const phone = record.phone;
      if (phone) await sendSMS(phone, `${record.message}`);
    }

    if (type === "payout.transfer_failed") {
      const phone = record.seller_phone ?? await getPhone(record.seller_id);
      const attempts = record.attempts ?? 1;
      const maxAttempts = 3;
      if (phone) {
        if (attempts < maxAttempts) {
          await sendSMS(phone,
            `SneakersHub: Your payout for order ${formatOrderId(record.order_id)} failed to process (attempt ${attempts}/${maxAttempts}). We'll retry automatically. If this persists contact us at sneakershub-sigma.vercel.app`
          );
        } else {
          await sendSMS(phone,
            `SneakersHub: Your payout for order ${formatOrderId(record.order_id)} has failed ${maxAttempts} times. Please contact support — we'll resolve this manually. sneakershub-sigma.vercel.app`
          );
        }
      }
    }

    if (type === "listing.created") {
      const phone = await getPhone(record.seller_id);
      if (phone) await sendSMS(phone,
        `SneakersHub: Your listing "${record.name}" is now live! Boost it to reach more buyers. sneakershub-sigma.vercel.app/account`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});