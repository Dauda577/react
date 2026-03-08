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
  typeof window !== "undefined" &&
  "Notification" in window;

export const PushProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const channelsRef = useRef<any[]>([]);

  const permission: NotificationPermission = checkSupported()
    ? Notification.permission
    : "denied";

  const requestPermission = async (): Promise<boolean> => {
    if (!checkSupported()) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  // ── Core notification function ─────────────────────────────────────────
  // Works in BOTH browser tabs AND installed PWA.
  // Strategy:
  //   1. Try service worker (works in PWA + modern browsers with active SW)
  //   2. Fall back to new Notification() (works in any browser with permission)
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

    // Try SW first — if it's not available or fails, fall back
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then((reg) => reg.showNotification(title, options as NotificationOptions))
        .catch(() => {
          // SW failed — use plain Notification API
          new Notification(title, { body, icon: "/icons/icon-192.png" });
        });
    } else {
      // No active service worker — plain Notification API
      // This is the path that runs in regular browser tabs
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    }
  };

  // ── Clean up all channels on unmount / user change ────────────────────
  const clearChannels = () => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  };

  // ── Subscribe to all push events for this user ────────────────────────
  useEffect(() => {
    if (!user?.id || !checkSupported() || Notification.permission !== "granted") return;

    clearChannels();

    // ── SELLER channels ──────────────────────────────────────────────────
    if (user.role === "seller") {

      // 1. Seller verified badge
      const verifiedCh = supabase
        .channel(`push:verified:${user.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          // profiles filter is safe — filtering by primary key always works
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
        .subscribe((s: string) => console.log("[Push] verified:", s));

      channelsRef.current.push(verifiedCh);

      // 2. New orders for seller — NO filter (client-side check instead)
      if (localStorage.getItem("notif_orders") !== "false") {
        const orderCh = supabase
          .channel(`push:orders:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "orders",
          }, (payload: any) => {
            // Client-side filter — only notify this seller
            if (payload.new.seller_id !== user.id) return;
            showLocalNotification(
              "🛒 New Order!",
              `You received a new order worth GHS ${payload.new.total}`,
              "/account"
            );
          })
          .subscribe((s: string) => console.log("[Push] seller orders:", s));

        channelsRef.current.push(orderCh);
      }

      // 3. New messages to seller — NO filter
      if (localStorage.getItem("notif_messages") !== "false") {
        const msgCh = supabase
          .channel(`push:seller:msgs:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages",
          }, (payload: any) => {
            // Client-side filter — only messages sent TO this seller
            if (payload.new.receiver_id !== user.id) return;
            const content: string = payload.new.content ?? "";
            showLocalNotification(
              "💬 New Message",
              content.length > 60 ? content.slice(0, 60) + "..." : content,
              "/account"
            );
          })
          .subscribe((s: string) => console.log("[Push] seller msgs:", s));

        channelsRef.current.push(msgCh);
      }
    }

    // ── BUYER channels ───────────────────────────────────────────────────
    if (user.role === "buyer") {

      // 1. Order status updates for buyer — NO filter
      if (localStorage.getItem("notif_orders") !== "false") {
        const orderCh = supabase
          .channel(`push:buyer:orders:${user.id}`)
          .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "orders",
          }, (payload: any) => {
            // Client-side filter — only this buyer's orders
            if (payload.new.buyer_id !== user.id) return;
            const { status } = payload.new;
            if (status === "shipped") {
              showLocalNotification(
                "📦 Order Shipped!",
                "Your order is on its way.",
                "/account"
              );
            } else if (status === "delivered") {
              showLocalNotification(
                "✅ Order Delivered!",
                "Your order has been delivered. Enjoy your kicks!",
                "/account"
              );
            }
          })
          .subscribe((s: string) => console.log("[Push] buyer orders:", s));

        channelsRef.current.push(orderCh);
      }

      // 2. New messages to buyer — NO filter
      if (localStorage.getItem("notif_messages") !== "false") {
        const msgCh = supabase
          .channel(`push:buyer:msgs:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "messages",
          }, (payload: any) => {
            // Client-side filter
            if (payload.new.receiver_id !== user.id) return;
            const content: string = payload.new.content ?? "";
            showLocalNotification(
              "💬 New Message",
              content.length > 60 ? content.slice(0, 60) + "..." : content,
              "/account"
            );
          })
          .subscribe((s: string) => console.log("[Push] buyer msgs:", s));

        channelsRef.current.push(msgCh);
      }
    }

    return clearChannels;
  }, [user?.id, user?.role]);

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