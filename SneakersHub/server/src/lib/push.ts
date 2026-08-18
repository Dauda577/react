import webpush from "web-push";
import { config } from "../config.js";
import { supabase } from "./supabase.js";

export type PushPayload = {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
};

// Sends a push to all of a user's stored subscriptions. Never throws —
// invalid/expired subscriptions are pruned and reported via the return value.
export async function sendPush(p: PushPayload): Promise<{ sent: number; pruned: number }> {
  if (!config.webPushEnabled) return { sent: 0, pruned: 0 };
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("user_id", p.user_id);

  let sent = 0;
  const prunedIds: string[] = [];

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys as { p256dh: string; auth: string },
        },
        JSON.stringify({
          title: p.title,
          body: p.body,
          icon: p.icon ?? "/icon-192.png",
          badge: p.badge ?? "/badge-72.png",
          data: { url: p.url ?? "/" },
        })
      );
      sent++;
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        prunedIds.push(sub.id);
      }
    }
  }

  if (prunedIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", prunedIds);
  }

  return { sent, pruned: prunedIds.length };
}