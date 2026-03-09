import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://sneakershub-sigma.vercel.app";
const FROM_EMAIL = "SneakersHub <marketing@yourdomain.com>"; // ← replace with your Resend verified domain

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
    .limit(12);

  if (error) throw new Error("Failed to fetch listings: " + error.message);
  return data ?? [];
}

// ── Fetch all buyers who haven't unsubscribed ─────────────────────────────────
async function getBuyerEmails() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("role", "buyer")
    .eq("marketing_unsubscribed", false);

  if (error) throw new Error("Failed to fetch buyers: " + error.message);
  return data ?? [];
}

// ── Build product card HTML ───────────────────────────────────────────────────
function productCard(listing: any) {
  const seller = listing.profiles;
  const badge = seller?.is_official
    ? `<span style="background:#6d28d9;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.05em;">✦ OFFICIAL</span>`
    : seller?.verified
    ? `<span style="background:#16a34a;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.05em;">✓ VERIFIED</span>`
    : `<span style="background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.05em;">⚡ FEATURED</span>`;

  const image = listing.image_url
    ? `<img src="${listing.image_url}" alt="${listing.name}" width="180" style="width:100%;height:160px;object-fit:contain;background:#f4f4f5;border-radius:8px 8px 0 0;display:block;" />`
    : `<div style="width:100%;height:160px;background:#f4f4f5;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:32px;">👟</div>`;

  return `
    <td style="width:33.33%;padding:8px;vertical-align:top;">
      <a href="${APP_URL}/product/${listing.id}" style="text-decoration:none;color:inherit;display:block;">
        <div style="border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;background:#fff;transition:all 0.2s;">
          ${image}
          <div style="padding:12px;">
            ${badge}
            <p style="margin:8px 0 2px;font-size:13px;font-weight:700;color:#09090b;font-family:sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${listing.name}</p>
            <p style="margin:0 0 6px;font-size:11px;color:#71717a;font-family:sans-serif;">${listing.brand}</p>
            <p style="margin:0;font-size:15px;font-weight:800;color:#09090b;font-family:sans-serif;">GHS ${listing.price.toLocaleString()}</p>
          </div>
        </div>
      </a>
    </td>
  `;
}

// ── Build full email HTML ─────────────────────────────────────────────────────
function buildEmail(buyerName: string, listings: any[], unsubToken: string) {
  // Split listings into rows of 3
  const rows: any[][] = [];
  for (let i = 0; i < listings.length; i += 3) {
    rows.push(listings.slice(i, i + 3));
  }

  const productRows = rows.map((row) => `
    <tr>
      ${row.map(productCard).join("")}
      ${row.length === 1 ? "<td style='width:33.33%;padding:8px;'></td><td style='width:33.33%;padding:8px;'></td>" : ""}
      ${row.length === 2 ? "<td style='width:33.33%;padding:8px;'></td>" : ""}
    </tr>
  `).join("");

  const firstName = buyerName?.split(" ")[0] ?? "Sneakerhead";

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
                You're receiving this because you have a SneakersHub buyer account.<br/>
                <a href="${APP_URL}/unsubscribe?token=${unsubToken}" style="color:#6d28d9;text-decoration:none;font-weight:600;">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#a1a1aa;text-decoration:none;">sneakershub-sigma.vercel.app</a>
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

// ── Send via Resend ───────────────────────────────────────────────────────────
async function sendEmail(to: string, name: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: "🔥 Featured Sneaker Drops Just For You",
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) console.warn(`Failed to send to ${to}:`, data);
  return data;
}

// ── Generate a simple unsubscribe token ──────────────────────────────────────
function unsubToken(userId: string) {
  // Simple base64 — good enough for unsubscribe links (not security-critical)
  return btoa(`unsub:${userId}:sneakershub`);
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("Starting marketing email job...");

    const [listings, buyers] = await Promise.all([
      getFeaturedListings(),
      getBuyerEmails(),
    ]);

    console.log(`Found ${listings.length} featured listings, ${buyers.length} buyers`);

    if (listings.length === 0) {
      return new Response(JSON.stringify({ message: "No featured listings — skipping" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    // Send one by one to avoid rate limits
    for (const buyer of buyers) {
      if (!buyer.email) continue;
      try {
        const token = unsubToken(buyer.id);
        const html = buildEmail(buyer.name, listings, token);
        await sendEmail(buyer.email, buyer.name, html);
        sent++;
        // Small delay to stay within Resend rate limits (100/day free tier)
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.warn(`Failed for ${buyer.email}:`, err);
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