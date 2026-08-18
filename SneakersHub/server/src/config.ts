import "dotenv/config";

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};

export const config = {
  port: Number(process.env.PORT ?? 8787),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  paystackSecretKey: required("PAYSTACK_SECRET_KEY"),
  paystackPublicKey: required("PAYSTACK_PUBLIC_KEY"),
  arkeselApiKey: required("ARKESEL_API_KEY"),
  arkeselSenderId: process.env.ARKESEL_SENDER_ID ?? "SneakersHub",
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@sneakershub.site",
  webPushEnabled: Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  ),
  // Seller verification fee (GHS)
  verificationFee: 50,
  // Boost fee (GHS) and how long a paid boost lasts (days)
  boostFee: 5,
  boostDurationDays: 10,
  // Escrow window in days before auto-release
  escrowDays: 7,
  defaultCommissionRate: 5,
} as const;

export const isProd = process.env.NODE_ENV === "production";