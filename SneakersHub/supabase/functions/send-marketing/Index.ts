import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://sneakershub.site";

// ── After signing up on Brevo, go to:
//    Senders & IPs → Senders → Add a Sender
//    You can use any email you own (even Gmail) as the sender name/email.
//    Brevo will send on your behalf via their servers.
const FROM_NAME = "SneakersHub";
const FROM_EMAIL = "daudakassim577@gmail.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Fetch active boosted + official listings ──────────────────────────────────
async function getFeaturedListings() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("listings")
    .select(`
      id, name, brand, price, image_url, category,
      profiles!seller_id (name, verified, is_official)
    `)
    .eq("status", "active")
    .eq("boosted", true)
    .or(`boost_expires_at.is.null,boost_expires_at.gt.${now}`)
    .order("boost_expires_at", { ascending: true, nullsFirst: true })
    .limit(4);

  if (error) throw new Error("Failed to fetch listings: " + error.message);
  return data ?? [];
}

// ── Fetch ALL users who haven't unsubscribed (buyers AND sellers) ────────────
async function getAllRecipients() {
  // Get ALL profiles (both buyers and sellers)
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("marketing_unsubscribed", false);  // Only those who haven't unsubscribed

  if (error) throw new Error("Failed to fetch profiles: " + error.message);
  if (!profiles?.length) return [];

  // Fetch emails from auth.users using the admin API (service role required)
  const recipients = await Promise.all(
    profiles.map(async (profile: any) => {
      const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
      return {
        id: profile.id,
        name: profile.name,
        email: userData?.user?.email ?? null,
      };
    })
  );

  return recipients.filter((r) => r.email);
}

// ── Build product card HTML ───────────────────────────────────────────────────
function productCard(listing: any) {
  const seller = listing.profiles;
  const badge = seller?.is_official
    ? `<span style="display:inline-block;background:#6d28d9;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;letter-spacing:0.04em;white-space:nowrap;">✦ OFFICIAL</span>`
    : seller?.verified
    ? `<span style="display:inline-block;background:#16a34a;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;letter-spacing:0.04em;white-space:nowrap;">✓ VERIFIED</span>`
    : `<span style="display:inline-block;background:#f59e0b;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;letter-spacing:0.04em;white-space:nowrap;">⚡ FEATURED</span>`;

  const image = listing.image_url
    ? `<img src="${listing.image_url}" alt="${listing.name}" style="width:100%;height:140px;object-fit:cover;background:#f4f4f5;border-radius:8px 8px 0 0;display:block;" />`
    : `<div style="width:100%;height:140px;background:#f4f4f5;border-radius:8px 8px 0 0;text-align:center;line-height:140px;font-size:32px;">👟</div>`;

  return `
    <td style="width:50%;padding:6px;vertical-align:top;">
      <a href="${APP_URL}/product/${listing.id}" style="text-decoration:none;color:inherit;display:block;">
        <div style="border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;background:#fff;">
          ${image}
          <div style="padding:10px;">
            ${badge}
            <p style="margin:6px 0 2px;font-size:12px;font-weight:700;color:#09090b;font-family:sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${listing.name}</p>
            <p style="margin:0 0 4px;font-size:10px;color:#71717a;font-family:sans-serif;">${listing.brand}</p>
            <p style="margin:0;font-size:13px;font-weight:800;color:#09090b;font-family:sans-serif;">GHS ${listing.price.toLocaleString()}</p>
          </div>
        </div>
      </a>
    </td>
  `;
}

// ── Build full email HTML ─────────────────────────────────────────────────────
function buildEmail(recipientName: string, listings: any[], unsubToken: string) {
  const rows: any[][] = [];
  for (let i = 0; i < listings.length; i += 2) {
    rows.push(listings.slice(i, i + 2));
  }

  const productRows = rows.map((row) => `
    <tr>
      ${row.map(productCard).join("")}
      ${row.length === 1 ? "<td style='width:50%;padding:6px;'></td>" : ""}
    </tr>
  `).join("");

  const firstName = recipientName?.split(" ")[0] ?? "Sneakerhead";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Featured Drops on SneakersHub</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#09090b;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.3em;color:#a1a1aa;text-transform:uppercase;">Sneakers Hub</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.03em;">Featured Drops 🔥</h1>
              <p style="margin:12px 0 0;font-size:14px;color:#a1a1aa;">Hey ${firstName}, here are the hottest picks right now</p>
            </td>
          </tr>

          <!-- Divider accent -->
          <tr>
            <td style="background:linear-gradient(90deg,#6d28d9,#2563eb,#059669);height:3px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:24px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${productRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#fff;padding:0 24px 32px;text-align:center;">
              <a href="${APP_URL}/shop"
                style="display:inline-block;background:#09090b;color:#fff;font-size:14px;font-weight:700;padding:14px 36px;border-radius:99px;text-decoration:none;letter-spacing:0.02em;">
                Browse All Sneakers →
              </a>
              <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">New drops added daily. Don't miss out.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;border-radius:0 0 16px 16px;padding:20px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a1a1aa;line-height:1.6;">
                You're receiving this because you have a SneakersHub account.<br/>
                <a href="${APP_URL}/unsubscribe?token=${unsubToken}" style="color:#6d28d9;text-decoration:none;font-weight:600;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#a1a1aa;text-decoration:none;">sneakershub.site</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ── Send via Brevo ────────────────────────────────────────────────────────────
async function sendEmail(to: string, toName: string, html: string) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to, name: toName }],
      subject: "🔥 Featured Sneaker Drops Just For You",
      htmlContent: html,
    }),
  });

  const data = await res.json();
  if (!res.ok) console.warn(`Failed to send to ${to}:`, JSON.stringify(data));
  return data;
}

// ── Generate unsubscribe token ────────────────────────────────────────────────
function unsubToken(userId: string) {
  return btoa(`unsub:${userId}:sneakershub`);
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("Starting marketing email job...");

    const [listings, recipients] = await Promise.all([
      getFeaturedListings(),
      getAllRecipients(),  // Changed to get ALL users
    ]);

    console.log(`Found ${listings.length} featured listings, ${recipients.length} recipients`);

    if (listings.length === 0) {
      return new Response(JSON.stringify({ message: "No featured listings — skipping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {  // Changed from 'buyer' to 'recipient'
      if (!recipient.email) continue;
      try {
        const token = unsubToken(recipient.id);
        const html = buildEmail(recipient.name, listings, token);
        await sendEmail(recipient.email, recipient.name, html);
        sent++;
        // 300ms delay to stay within Brevo rate limits
        await new Promise((r) => setTimeout(r, 300));
      } catch (err) {
        console.warn(`Failed for ${recipient.email}:`, err);
        failed++;
      }
    }

    console.log(`Done. Sent: ${sent}, Failed: ${failed}`);

    return new Response(JSON.stringify({ success: true, sent, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Marketing email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});