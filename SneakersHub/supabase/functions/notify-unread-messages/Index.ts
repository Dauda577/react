import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_API_KEY  = Deno.env.get("ARKESEL_API_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendSMS(to: string, message: string) {
  let phone = to.replace(/\s+/g, "").replace(/^\+/, "").replace(/^233/, "").replace(/^0/, "");
  phone = `233${phone}`;
  const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
    method: "POST",
    headers: { "api-key": ARKESEL_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: "SneakersHub", message, recipients: [phone] }),
  });
  const data = await res.json();
  console.log(`[notify-unread] SMS to ${phone}:`, data?.status);
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // Find all unread messages older than 2 days that haven't had an SMS sent yet
    // Group by receiver so we send ONE SMS per person, not one per message
    const { data: messages, error } = await supabase
      .from("messages")
      .select(`
        id,
        receiver_id,
        sender_id,
        content,
        created_at
      `)
      .eq("seen", false)
      .is("sms_notified_at", null)
      .lt("created_at", twoDaysAgo)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    if (!messages || messages.length === 0) {
      console.log("[notify-unread] No unread messages to notify");
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[notify-unread] Found ${messages.length} unread messages`);

    // Fetch receiver profiles separately
    const receiverIds = [...new Set(messages.map((m: any) => m.receiver_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, phone")
      .in("id", receiverIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    // Group by receiver_id — send one SMS per receiver regardless of how many messages
    const byReceiver = new Map<string, { phone: string; name: string; count: number; ids: string[] }>();

    for (const msg of messages) {
      const profile = profileMap.get(msg.receiver_id);
      const phone = profile?.phone;
      const name  = profile?.name ?? "there";
      if (!phone) continue; // skip if no phone number

      if (!byReceiver.has(msg.receiver_id)) {
        byReceiver.set(msg.receiver_id, { phone, name, count: 0, ids: [] });
      }
      const entry = byReceiver.get(msg.receiver_id)!;
      entry.count++;
      entry.ids.push(msg.id);
    }

    let notified = 0;
    let failed   = 0;

    for (const [_receiverId, { phone, name, count, ids }] of byReceiver) {
      try {
        const plural  = count === 1 ? "message" : "messages";
        const message = `Hi ${name}, you have ${count} unread ${plural} on SneakersHub. Open the app to reply: sneakershub-sigma.vercel.app/account`;

        await sendSMS(phone, message);

        // Mark all these messages as notified so we don't SMS again
        await supabase
          .from("messages")
          .update({ sms_notified_at: new Date().toISOString() })
          .in("id", ids);

        notified++;
      } catch (err) {
        console.error(`[notify-unread] Failed for receiver ${_receiverId}:`, err);
        failed++;
      }
    }

    console.log(`[notify-unread] Done — notified: ${notified}, failed: ${failed}`);
    return new Response(JSON.stringify({ success: true, notified, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[notify-unread] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});