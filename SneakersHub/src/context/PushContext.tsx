import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface PushContextType {
  requestPermission: () => Promise<boolean>;
  isSupported: boolean;
  permission: NotificationPermission;
  showLocalNotification: (title: string, body: string, url?: string) => void;
}

const PushContext = createContext<PushContextType | null>(null);

export const usePush = () => {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used within PushProvider");
  return ctx;
};

const checkSupported = () =>
  typeof window !== "undefined" && "Notification" in window;

export const PushProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const channelsRef = useRef<any[]>([]);

  const permission: NotificationPermission = checkSupported()
    ? Notification.permission
    : "denied";

  // ── Show a notification (works in browser AND installed PWA) ─────────────
  // Fetch item names for a given order_id to enrich push notifications
  const getOrderSummary = async (orderId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from("order_items")
        .select("name, quantity")
        .eq("order_id", orderId);
      if (!data || data.length === 0) return "your order";
      const parts = data.map((i: any) => i.quantity > 1 ? `${i.name} (x${i.quantity})` : i.name);
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return parts.join(" & ");
      return `${parts[0]} + ${parts.length - 1} more`;
    } catch { return "your order"; }
  };

  const showLocalNotification = (title: string, body: string, url = "/account") => {
    if (!checkSupported() || Notification.permission !== "granted") return;

    const options = {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url },
      tag: `sneakershub-${Date.now()}`,
      renotify: true,
    };

    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, options as NotificationOptions))
        .catch(() => new Notification(title, { body, icon: "/icons/icon-192.png" }));
    } else {
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    }
  };

  // ── Request permission ────────────────────────────────────────────────────
  const requestPermission = async (): Promise<boolean> => {
    if (!checkSupported()) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  // NOTE: Permission is requested in Auth.tsx right after login/signup.
  // PushContext only subscribes to channels — it does not auto-request.

  // ── Clean up channels ─────────────────────────────────────────────────────
  const clearChannels = () => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  };

  // ── Subscribe to realtime push events ────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !checkSupported() || Notification.permission !== "granted") return;

    // Delay push subscriptions so they don't compete with page mount
    const t = setTimeout(async () => {
    clearChannels();

    // ── SELLER ───────────────────────────────────────────────────────────────
    if (user.role === "seller") {

      // Verified badge
      const verifiedCh = supabase
        .channel(`push:verified:${user.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        }, (payload: any) => {
          if (!payload.old?.verified && payload.new?.verified) {
            showLocalNotification(
              "✅ Account Verified!",
              "Your SneakersHub seller account is now verified.",
              "/account"
            );
          }
        })
        .subscribe();
      channelsRef.current.push(verifiedCh);

      // Listing published confirmation
      const listingCh = supabase
        .channel(`push:listings:${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "listings",
          filter: `seller_id=eq.${user.id}`,
        }, (payload: any) => {
          const name = payload.new?.name ?? "Your listing";
          showLocalNotification(
            "✅ Listing Published!",
            `"${name}" is now live on SneakersHub.`,
            "/account"
          );
        })
        .subscribe();
      channelsRef.current.push(listingCh);

      // Dispute push — check if this seller is official (admin)
      const { data: profileData } = await supabase
        .from("profiles").select("is_official").eq("id", user.id).single();
      if (profileData?.is_official) {
        const disputeCh = supabase
          .channel(`push:disputes:${user.id}`)
          .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "orders",
          }, async (payload: any) => {
            if (payload.new.payout_status !== "disputed") return;
            const orderId = (() => {
              const num = parseInt(payload.new.id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
              return `#${num.toString().padStart(9, "0")}`;
            })();
            const items = await getOrderSummary(payload.new.id);
            showLocalNotification(
              `⚠️ Dispute — ${orderId}`,
              `${items} — GHS ${payload.new.total}. Review in admin.`,
              "/admin"
            );
          })
          .subscribe();
        channelsRef.current.push(disputeCh);
      }

      // New orders — DB-level filter so only this seller's orders fire
      if (localStorage.getItem("notif_orders") !== "false") {
        const orderCh = supabase
          .channel(`push:orders:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `seller_id=eq.${user.id}`,
          }, async (payload: any) => {
            const items = await getOrderSummary(payload.new.id);
            const orderId = (() => {
              const num = parseInt(payload.new.id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
              return `#${num.toString().padStart(9, "0")}`;
            })();
            showLocalNotification(
              `🛒 New Order ${orderId}`,
              `${items} — GHS ${payload.new.total}`,
              "/account"
            );
          })
          .subscribe();
        channelsRef.current.push(orderCh);
      }

      // New messages to seller — DB-level filter
      if (localStorage.getItem("notif_messages") !== "false") {
        const msgCh = supabase
          .channel(`push:seller:msgs:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          }, (payload: any) => {
            const content: string = payload.new.content ?? "";
            showLocalNotification(
              "💬 New Message",
              content.length > 60 ? content.slice(0, 60) + "..." : content,
              "/account"
            );
          })
          .subscribe();
        channelsRef.current.push(msgCh);
      }
    }

    // ── BUYER ────────────────────────────────────────────────────────────────
    if (user.role === "buyer") {

      // Order status updates — DB-level filter
      if (localStorage.getItem("notif_orders") !== "false") {
        const orderCh = supabase
          .channel(`push:buyer:orders:${user.id}`)
          .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `buyer_id=eq.${user.id}`,
          }, (payload: any) => {
            const { status } = payload.new;
            const orderId = (() => {
              const num = parseInt(payload.new.id.replace(/-/g, "").slice(0, 10), 16) % 1000000000;
              return `#${num.toString().padStart(9, "0")}`;
            })();
            if (status === "shipped") {
              getOrderSummary(payload.new.id).then(items => {
                showLocalNotification(
                  `📦 Order ${orderId} Shipped!`,
                  `${items} — GHS ${payload.new.total} is on its way.`,
                  "/account"
                );
              });
            } else if (status === "delivered") {
              getOrderSummary(payload.new.id).then(items => {
                showLocalNotification(
                  `✅ Order ${orderId} Confirmed!`,
                  `${items} — GHS ${payload.new.total}. Enjoy your kicks! 👟`,
                  "/account"
                );
              });
            }
          })
          .subscribe();
        channelsRef.current.push(orderCh);
      }

      // New messages to buyer — DB-level filter
      if (localStorage.getItem("notif_messages") !== "false") {
        const msgCh = supabase
          .channel(`push:buyer:msgs:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          }, (payload: any) => {
            const content: string = payload.new.content ?? "";
            showLocalNotification(
              "💬 New Message",
              content.length > 60 ? content.slice(0, 60) + "..." : content,
              "/account"
            );
          })
          .subscribe();
        channelsRef.current.push(msgCh);
      }
    }

    }, 3000);
    return () => { clearTimeout(t); clearChannels(); };
  }, [user?.id, user?.role, permission]);

  return (
    <PushContext.Provider value={{
      requestPermission,
      isSupported: checkSupported(),
      permission,
      showLocalNotification,
    }}>
      {children}
    </PushContext.Provider>
  );
};