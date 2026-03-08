// src/lib/sms.ts
// Call this from OrderContext whenever order status changes

import { supabase } from "@/lib/supabase";

type SMSEvent =
  | { type: "order.created"; record: any }
  | { type: "order.shipped"; record: any }
  | { type: "order.delivered"; record: any }
  | { type: "message.created"; record: any };

export async function triggerSMS(event: SMSEvent) {
  try {
    const { error } = await supabase.functions.invoke("send-sms", {
      body: event,
    });
    if (error) console.warn("SMS trigger failed:", error.message);
  } catch (err) {
    // Never let SMS failure break the app
    console.warn("SMS error (non-fatal):", err);
  }
}