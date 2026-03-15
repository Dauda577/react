import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ARKESEL_API_KEY = Deno.env.get("ARKESEL_API_KEY");
const ARKESEL_SENDER_ID = Deno.env.get("ARKESEL_SENDER_ID") || "SneakersHub";

serve(async (req) => {
  try {
    console.log("📨 SMS function started");
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { type, record } = body;
    
    // Check if API key is configured
    if (!ARKESEL_API_KEY) {
      console.error("❌ ARKESEL_API_KEY is not set");
      return new Response(
        JSON.stringify({ error: "SMS service not configured - missing API key" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log("✅ API key is set");
    
    let phoneNumber = "";
    let message = "";

    // Format message based on event type
    switch (type) {
      case "order.created":
        phoneNumber = record.buyer_phone;
        message = `✅ Order confirmed! Your order #${record.id?.slice(-8)} for GHS ${record.total} has been placed. Track it in the SneakersHub app.`;
        break;
        
      case "order.shipped":
        phoneNumber = record.buyer_phone;
        message = `📦 Your order #${record.id?.slice(-8)} has been shipped! You'll receive tracking details soon. Track at sneakershub.site/account`;
        break;
        
      case "order.delivered":
        phoneNumber = record.buyer_phone;
        message = `🎉 Your order #${record.id?.slice(-8)} has been delivered! Enjoy your sneakers! Rate your seller in the app.`;
        break;
        
      case "message.created":
        phoneNumber = record.recipient_phone;
        message = `💬 You have a new message from ${record.sender_name} on SneakersHub. Check your inbox at sneakershub.site/account`;
        break;
        
      case "listing.created":
        phoneNumber = record.seller_phone;
        message = `👟 Your listing "${record.listing_name?.substring(0, 30)}" is now live on SneakersHub! View it at sneakershub.site/shop`;
        break;
        
      case "payout.released":
        phoneNumber = record.seller_phone;
        message = `💰 GHS ${record.amount} has been paid out to your MoMo account for order #${record.order_id?.slice(-8)}. Thank you for selling on SneakersHub!`;
        break;
        
      case "payout.missing_details":
        phoneNumber = record.seller_phone;
        message = `⚠️ Please add your payout details in Settings to receive payments from SneakersHub. Go to sneakershub.site/account`;
        break;
        
      case "payout.transfer_failed":
        phoneNumber = record.seller_phone;
        message = `❌ Payout failed for order #${record.order_id?.slice(-8)}. Please check your MoMo details in Settings at sneakershub.site/account`;
        break;
        
      case "admin.alert":
        phoneNumber = record.admin_phone;
        message = record.message;
        break;
        
      default:
        console.error("❌ Unknown SMS type:", type);
        return new Response(
          JSON.stringify({ error: "Unknown SMS type" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    if (!phoneNumber) {
      console.error("❌ No phone number found in record");
      return new Response(
        JSON.stringify({ error: "No recipient phone number" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format phone number for Arkesel (Ghana)
    let formattedNumber = phoneNumber.replace(/\D/g, "");
    console.log("📞 Original phone:", phoneNumber, "Formatted:", formattedNumber);
    
    // If starts with 0, replace with 233
    if (formattedNumber.startsWith("0")) {
      formattedNumber = "233" + formattedNumber.slice(1);
    } else if (!formattedNumber.startsWith("233")) {
      formattedNumber = "233" + formattedNumber;
    }

    // Ensure it's exactly 12 digits (233 + 9 digits)
    if (formattedNumber.length !== 12) {
      console.error("❌ Invalid phone number format:", formattedNumber);
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`📤 Sending SMS to ${formattedNumber}: ${message}`);

    // Try Arkesel API v1 (most common)
    console.log("Attempting Arkesel API v1...");
    const v1Response = await fetch("https://sms.arkesel.com/api/v1/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "api-key": ARKESEL_API_KEY,
      },
      body: new URLSearchParams({
        sender: ARKESEL_SENDER_ID,
        message: message,
        to: formattedNumber,
      }),
    });

    const v1Result = await v1Response.json();
    console.log("Arkesel v1 response:", JSON.stringify(v1Result, null, 2));
    
    if (v1Response.ok) {
      console.log("✅ SMS sent successfully via v1");
      return new Response(
        JSON.stringify({ success: true, result: v1Result }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // If v1 fails, try v2
    console.log("v1 failed, attempting Arkesel API v2...");
    const v2Response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": ARKESEL_API_KEY,
      },
      body: JSON.stringify({
        sender: ARKESEL_SENDER_ID,
        message: message,
        recipients: [formattedNumber],
      }),
    });

    const v2Result = await v2Response.json();
    console.log("Arkesel v2 response:", JSON.stringify(v2Result, null, 2));
    
    if (v2Response.ok) {
      console.log("✅ SMS sent successfully via v2");
      return new Response(
        JSON.stringify({ success: true, result: v2Result }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Both failed
    console.error("❌ Both API versions failed");
    return new Response(
      JSON.stringify({ 
        error: "Failed to send SMS", 
        v1: v1Result,
        v2: v2Result 
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ SMS function error:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});