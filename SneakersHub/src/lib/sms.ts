// src/lib/sms.ts
import { supabase } from "@/lib/supabase";

type SMSEvent =
  | { type: "order.created";          record: any }
  | { type: "order.shipped";          record: any }
  | { type: "order.delivered";        record: any }
  | { type: "message.created";        record: any }
  | { type: "listing.created";        record: any }
  | { type: "payout.released";        record: any }
  | { type: "payout.missing_details"; record: any }
  | { type: "payout.transfer_failed"; record: any }
  | { type: "admin.alert";            record: any }
  | { type: "order.seller_notified";  record: any };

export async function triggerSMS(event: SMSEvent) {
  try {
    const { error } = await supabase.functions.invoke("send-sms", {
      body: event,
    });
    if (error) console.warn("SMS trigger failed:", error.message);
  } catch (err) {
    console.warn("SMS error (non-fatal):", err);
  }
}