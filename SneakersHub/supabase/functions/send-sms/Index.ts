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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { type, record } = await req.json();
    console.log("Event type:", type, "Record:", JSON.stringify(record));

    if (type === "order.created") {
      const phone = await getPhone(record.seller_id);
      console.log("Seller phone:", phone);
      if (phone) await sendSMS(phone, `SneakersHub: New order ${formatOrderId(record.id)} worth GHS ${record.total}. Open app to confirm. sneakershub-sigma.vercel.app/account`);
    }

    if (type === "order.shipped") {
      const phone = record.buyer?.phone ?? await getPhone(record.buyer_id);
      console.log("Buyer phone:", phone);
      if (phone) await sendSMS(phone, `SneakersHub: Your order ${formatOrderId(record.id)} has been shipped! sneakershub-sigma.vercel.app/account`);
    }

    if (type === "order.delivered") {
      const phone = record.buyer?.phone ?? await getPhone(record.buyer_id);
      console.log("Buyer phone:", phone);
      if (phone) await sendSMS(phone, `SneakersHub: Your order ${formatOrderId(record.id)} has been delivered! Enjoy your kicks. sneakershub-sigma.vercel.app/account`);
    }

    if (type === "message.created") {
      const phone = await getPhone(record.receiver_id);
      console.log("Receiver phone:", phone);
      if (phone) {
        const preview = record.content?.length > 50 ? record.content.slice(0, 50) + "..." : record.content;
        await sendSMS(phone, `SneakersHub: New message: "${preview}". Reply at sneakershub-sigma.vercel.app/account`);
      }
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