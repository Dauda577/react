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

      // New orders — DB-level filter so only this seller's orders fire
      if (localStorage.getItem("notif_orders") !== "false") {
        const orderCh = supabase
          .channel(`push:orders:${user.id}`)
          .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `seller_id=eq.${user.id}`,
          }, (payload: any) => {
            showLocalNotification(
              "🛒 New Order!",
              `You received a new order worth GHS ${payload.new.total}`,
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
            if (status === "shipped") {
              showLocalNotification("📦 Order Shipped!", "Your order is on its way.", "/account");
            } else if (status === "delivered") {
              showLocalNotification("✅ Order Delivered!", "Your order has been delivered. Enjoy your kicks!", "/account");
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

    return clearChannels;
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