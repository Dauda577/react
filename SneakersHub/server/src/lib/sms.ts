import { config } from "../config.js";

// POST https://sms.arkesel.com/api/v2/sms/send
// auth: api-key header, body { sender, message, recipients: string[] }
export async function sendSms(
  phone: string,
  message: string,
  sender: string = config.arkeselSenderId
): Promise<{ ok: boolean; error?: string }> {
  if (!phone) return { ok: false, error: "Missing phone" };
  const normalized = phone.replace(/^\+/, "").replace(/^0/, "233");
  try {
    const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
      method: "POST",
      headers: {
        "api-key": config.arkeselApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender,
        message,
        recipients: [normalized],
      }),
    });
    const body = (await res.json()) as any;
    if (!res.ok || (body.status !== undefined && body.status !== "success" && body.code !== 200 && body.code !== 201)) {
      return { ok: false, error: body.message ?? `Arkesel ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "SMS send failed" };
  }
}