import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { subscription, title, body, url, icon, badge, data } = await req.json();

    // Validate required fields
    if (!subscription || !subscription.endpoint) {
      throw new Error("Invalid push subscription");
    }

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

    // Send the push notification
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
      const errorText = await response.text();
      console.error("Push service error:", errorText);
      
      // If subscription is expired/invalid, return 410 so client can clean up
      if (response.status === 410) {
        return new Response(
          JSON.stringify({ error: "Subscription expired", code: "EXPIRED" }),
          { status: 410, headers: { "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Push service responded with ${response.status}: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Push error:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        code: "PUSH_FAILED"
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});