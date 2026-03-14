import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { subscription, title, body, url, icon, badge, data } = await req.json();

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icon-192.png",
      badge: badge || "/badge-72.png",
      data: {
        url,
        ...data
      }
    });

    // Send the push notification directly to the push service
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
        "Authorization": `key=${Deno.env.get("VAPID_PRIVATE_KEY")}`,
      },
      body: payload,
    });

    if (!response.ok) {
      console.error("Push service error:", await response.text());
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});