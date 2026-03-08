import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

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

// ─── Utility ────────────────────────────────────────────────────────────────

const isSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator;

// ─── Provider ───────────────────────────────────────────────────────────────

export const PushProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const prevOrderCount = useRef<number>(0);
  const prevMessageCount = useRef<number>(0);

  const permission: NotificationPermission = isSupported()
    ? Notification.permission
    : "denied";

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported()) return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  };

  const showLocalNotification = (title: string, body: string, url = "/") => {
    if (!isSupported() || Notification.permission !== "granted") return;

    // Prefer service worker notification (shows even when tab is backgrounded)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          vibrate: [100, 50, 100],
          data: { url },
          tag: "sneakershub",
          renotify: true,
        } as NotificationOptions);
      });
    } else {
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    }
  };

  // ── Watch orders via Supabase realtime ───────────────────────────────────
  useEffect(() => {
    if (!user?.id || !isSupported() || Notification.permission !== "granted") return;
    if (localStorage.getItem("notif_orders") === "false") return;

    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`push:orders:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "orders",
            filter: `seller_id=eq.${user.id}`,
          },
          (payload: any) => {
            const order = payload.new;
            showLocalNotification(
              "🛒 New Order!",
              `You received a new order worth GHS ${order.total}`,
              "/account"
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "orders",
            filter: `buyer_id=eq.${user.id}`,
          },
          (payload: any) => {
            const order = payload.new;
            if (order.status === "shipped") {
              showLocalNotification(
                "📦 Order Shipped!",
                `Your order has been shipped and is on its way.`,
                "/account"
              );
            } else if (order.status === "delivered") {
              showLocalNotification(
                "✅ Order Delivered!",
                `Your order has been delivered. Enjoy your kicks!`,
                "/account"
              );
            }
          }
        )
        .subscribe();
    });

    return () => {
      import("@/lib/supabase").then(({ supabase }) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [user?.id]);

  // ── Watch messages ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !isSupported() || Notification.permission !== "granted") return;
    if (localStorage.getItem("notif_messages") === "false") return;

    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`push:messages:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload: any) => {
            const msg = payload.new;
            // Only notify if tab is hidden
            if (document.visibilityState === "hidden") {
              showLocalNotification(
                "💬 New Message",
                msg.content.length > 60
                  ? msg.content.slice(0, 60) + "..."
                  : msg.content,
                "/account"
              );
            }
          }
        )
        .subscribe();
    });

    return () => {
      import("@/lib/supabase").then(({ supabase }) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [user?.id]);

  return (
    <PushContext.Provider
      value={{
        requestPermission,
        isSupported: isSupported(),
        permission,
        showLocalNotification,
      }}
    >
      {children}
    </PushContext.Provider>
  );
};