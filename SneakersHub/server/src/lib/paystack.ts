import crypto from "node:crypto";
import { config } from "../config.js";

const BASE = "https://api.paystack.co";

// Raw fetch with auth headers — returns the Response so callers can inspect
// status/body themselves.
export async function paystackRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export const paystackGet = (path: string) => paystackRequest(path);
export const paystackPost = (path: string, body: unknown) =>
  paystackRequest(path, { method: "POST", body: JSON.stringify(body) });

// Throwing variant for call sites that want a clean value or an Error.
async function paystack<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await paystackRequest(path, init);
  const body = (await res.json()) as any;
  if (!res.ok || body.status === false) {
    throw new Error(body.message ?? `Paystack error ${res.status}`);
  }
  return body as T;
}

export type InitializeTransactionParams = {
  email: string;
  amountKobo: number;
  reference?: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  channels?: string[];
  label?: string;
  currency?: string;
};

// amountKobo is in minor units (kobo/pesewas): GHS 5.00 -> 500
export function initializeTransaction(p: InitializeTransactionParams) {
  return paystack<{
    status: boolean;
    data: { authorization_url: string; reference: string; access_code: string };
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: p.email,
      amount: p.amountKobo,
      reference: p.reference,
      metadata: p.metadata,
      callback_url: p.callbackUrl,
      currency: p.currency ?? "GHS",
      channels: p.channels ?? ["card", "mobile_money"],
      label: p.label,
    }),
  });
}

export type VerifiedTransaction = {
  status: boolean;
  data: {
    id: number;
    reference: string;
    status: "success" | "failed" | "abandoned" | string;
    amount: number;
    currency: string;
    paid_at?: string;
    metadata?: Record<string, any>;
    customer?: { email?: string };
    fees?: number;
  };
};

export function verifyTransaction(reference: string) {
  return paystack<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

// HMAC SHA-512 of the raw request body — must match x-paystack-signature.
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || signature.length !== 128) return false;
  const hash = crypto.createHmac("sha512", config.paystackSecretKey).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(signature, "hex"));
}

export { BASE as paystackBase };