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
        message = `⚠️ Please add your payout details in Settings to receive payments from SneakersHub. Go to sneakershub.site/account?tab=settings`;
        break;
        
      case "payout.transfer_failed":
        phoneNumber = record.seller_phone;
        message = `❌ Payout failed for order #${record.order_id?.slice(-8)}. Please check your MoMo details in Settings at sneakershub.site/account?tab=settings`;
        break;
        
      // ✅ NEW: Seller application approval
      case "application.approved":
        phoneNumber = record.phone || record.seller_phone;
        message = record.message || `🎉 Congratulations! Your seller application has been approved! Pay the GHS 50 verification fee to start selling. Tap here: https://sneakershub.site/account?tab=settings`;
        break;
        
      // ✅ NEW: Seller application rejection
      case "application.rejected":
        phoneNumber = record.phone || record.seller_phone;
        message = record.message || `Your seller application was not approved. You can re-apply anytime. Tap here: https://sneakershub.site/account`;
        break;
        
      case "admin.alert":
        phoneNumber = record.seller_phone || record.admin_phone;
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

    // Try Arkesel API with proper error handling
    const response = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
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

    // Check if response is JSON or HTML
    const contentType = response.headers.get("content-type");
    let result;
    
    if (contentType?.includes("application/json")) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.error("❌ Non-JSON response:", text.substring(0, 200));
      return new Response(
        JSON.stringify({ 
          error: "Invalid response from SMS provider", 
          status: response.status,
          response: text.substring(0, 200) 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log("Arkesel response:", JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error("❌ Arkesel API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: result }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ SMS function error:", error);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});