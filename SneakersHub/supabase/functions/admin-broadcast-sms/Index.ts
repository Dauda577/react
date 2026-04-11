import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARKESEL_API_KEY   = Deno.env.get("ARKESEL_API_KEY")!;
const ARKESEL_SENDER_ID = Deno.env.get("ARKESEL_SENDER_ID") || "SneakersHub";
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhone(phone: string): string | null {
  let n = phone.replace(/\D/g, "");
  if (n.startsWith("0"))   n = "233" + n.slice(1);
  if (!n.startsWith("233")) n = "233" + n;
  return n.length === 12 ? n : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { message, recipient_ids } = await req.json();

    if (!message || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Missing message or recipient_ids" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles with phones
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, name, phone")
      .in("id", recipient_ids)
      .not("phone", "is", null);

    if (error) throw new Error("Failed to fetch profiles: " + error.message);

    let sent = 0;
    let failed = 0;

    for (const profile of profiles ?? []) {
      const formatted = formatPhone(profile.phone);
      if (!formatted) { failed++; continue; }

      try {
        const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": ARKESEL_API_KEY,
          },
          body: JSON.stringify({
            sender:     ARKESEL_SENDER_ID,
            message:    message.trim(),
            recipients: [formatted],
          }),
        });
        res.ok ? sent++ : failed++;
      } catch { failed++; }

      // Respect Arkesel rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    return new Response(JSON.stringify({ success: true, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("SMS broadcast error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});