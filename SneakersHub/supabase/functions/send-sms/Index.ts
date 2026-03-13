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
  const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "SneakersHub", message, recipients: [phone] }),
  });
  const data = await res.json();
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

  // ── Internal auth: must be called from Supabase edge functions or server ──
  const internalSecret = req.headers.get("x-internal-secret");
  const expectedSecret = Deno.env.get("INTERNAL_SECRET");
  if (expectedSecret && internalSecret !== expectedSecret) {
    // Also allow service-role JWT calls
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.includes("Bearer")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }


  try {
    const { type, record } = await req.json();

    if (type === "order.created") {
      const phone = await getPhone(record.seller_id);
      if (phone) {
        const items = formatItems(record.items);

        // Fetch seller tier to send the right message
        const { data: seller } = await supabaseAdmin
          .from("profiles")
          .select("verified, is_official")
          .eq("id", record.seller_id)
          .single();

        const isPaid = seller?.is_official || seller?.verified;

        if (isPaid) {
          // Buyer has already paid via Paystack — money is processing
          await sendSMS(phone,
            `SneakersHub: New order ${formatOrderId(record.id)} — ${items} — GHS ${record.total}. Payment received ✅ Your payout will be processed within 24hrs. Dispatch when ready. sneakershub.site/account`
          );
        } else {
          // Pay on delivery — buyer hasn't paid yet
          await sendSMS(phone,
            `SneakersHub: New order ${formatOrderId(record.id)} — ${items} — GHS ${record.total}. Pay on delivery. Confirm & dispatch when ready. sneakershub.site/account`
          );
        }
      }
    }

    if (type === "order.shipped") {
      const phone = record.buyer?.phone ?? await getPhone(record.buyer_id);
      if (phone) {
        const items = formatItems(record.items);
        await sendSMS(phone,
          `SneakersHub: Order ${formatOrderId(record.id)} dispatched! ${items} — GHS ${record.total}. Confirm receipt when your sneakers arrive: sneakershub.site/account`
        );
      }
    }

    if (type === "order.delivered") {
      const phone = record.buyer?.phone ?? await getPhone(record.buyer_id);
      if (phone) {
        const items = formatItems(record.items);
        await sendSMS(phone,
          `SneakersHub: Order ${formatOrderId(record.id)} confirmed! ${items} — GHS ${record.total}. Enjoy your kicks! 👟 sneakershub.site/account`
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
          `SneakersHub: New message: "${preview}". Reply at sneakershub.site/account`
        );
      }
    }


    if (type === "payout.missing_details") {
      // Verified seller hasn't added payout details — funds are being held
      const phone = record.seller_phone ?? await getPhone(record.seller_id);
      if (phone) await sendSMS(phone,
        `SneakersHub: You have a pending payout for order ${formatOrderId(record.order_id)} but no payout details set. Add your MoMo number in Settings to receive your payment: sneakershub.site/account`
      );
    }

    if (type === "payout.released") {
      const phone = await getPhone(record.seller_id);
      if (phone) {
        const trigger = record.trigger === "auto" ? "auto-released after 3 days" : "released";
        await sendSMS(phone,
          `SneakersHub: GHS ${record.amount} payout ${trigger} for order ${formatOrderId(record.order_id)} (sale total GHS ${record.order_total ?? record.amount}). Check your ${record.payout_method ?? "account"}. sneakershub.site`
        );
      }
    }



    if (type === "application.approved") {
      const phone = record.momo_number ?? await getPhone(record.user_id);
      if (phone) await sendSMS(phone,
        `SneakersHub: Great news! Your seller application for "${record.store_name}" has been approved. Log in to your account and pay the GHS 50 verification fee to activate your seller dashboard. sneakershub.site/account`
      );
    }

    if (type === "application.rejected") {
      const phone = record.momo_number ?? await getPhone(record.user_id);
      if (phone) await sendSMS(phone,
        `SneakersHub: Your seller application for "${record.store_name}" was not approved at this time. You're welcome to re-apply with more details. sneakershub.site/account`
      );
    }

    if (type === "listing.created") {
      const phone = await getPhone(record.seller_id);
      if (phone) await sendSMS(phone,
        `SneakersHub: Your listing "${record.name}" is now live! Boost it to reach more buyers. sneakershub.site/account`
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