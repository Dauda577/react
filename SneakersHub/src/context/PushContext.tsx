import { createContext, useContext, useEffect, ReactNode } from "react";
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

const isSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window &&
  "serviceWorker" in navigator;

export const PushProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

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

  // ── Seller: verification status ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || user.role !== "seller") return;
    if (!isSupported() || Notification.permission !== "granted") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`push:seller:verified:${user.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        }, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const wasVerified = payload.old?.verified;
          const isNowVerified = payload.new?.verified;
          if (!wasVerified && isNowVerified) {
            showLocalNotification(
              "✅ Account Verified!",
              "Congratulations! Your SneakersHub seller account has been verified.",
              "/account"
            );
          }
        })
        .subscribe((status: string) => console.log("[Push] verified:", status));
    });
    return () => {
      import("@/lib/supabase").then(({ supabase }) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [user?.id, user?.role]);

  // ── Seller: new orders ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || user.role !== "seller") return;
    if (!isSupported() || Notification.permission !== "granted") return;
    if (localStorage.getItem("notif_orders") === "false") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`push:seller:orders:${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${user.id}`,
        }, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          showLocalNotification(
            "🛒 New Order!",
            `You received a new order worth GHS ${payload.new.total}`,
            "/account"
          );
        })
        .subscribe((status: string) => console.log("[Push] seller:", status));
    });
    return () => {
      import("@/lib/supabase").then(({ supabase }) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [user?.id, user?.role]);

  // ── Buyer: order status updates ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || user.role !== "buyer") return;
    if (!isSupported() || Notification.permission !== "granted") return;
    if (localStorage.getItem("notif_orders") === "false") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`push:buyer:orders:${user.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `buyer_id=eq.${user.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any 
        (payload: any) => {
          const { status } = payload.new;
          if (status === "shipped") {
            showLocalNotification("📦 Order Shipped!", "Your order is on its way.", "/account");
          } else if (status === "delivered") {
            showLocalNotification("✅ Order Delivered!", "Your order has been delivered. Enjoy your kicks!", "/account");
          }
        })
        .subscribe((status: string) => console.log("[Push] buyer:", status));
    });
    return () => {
      import("@/lib/supabase").then(({ supabase }) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [user?.id, user?.role]);

  // ── Both: new messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    if (!isSupported() || Notification.permission !== "granted") return;
    if (localStorage.getItem("notif_messages") === "false") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any;
    import("@/lib/supabase").then(({ supabase }) => {
      channel = supabase
        .channel(`push:messages:${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (document.visibilityState === "hidden") {
            const content = payload.new.content;
            showLocalNotification(
              "💬 New Message",
              content.length > 60 ? content.slice(0, 60) + "..." : content,
              "/account"
            );
          }
        })
        .subscribe((status: string) => console.log("[Push] messages:", status));
    });
    return () => {
      import("@/lib/supabase").then(({ supabase }) => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [user?.id]);

  return (
    <PushContext.Provider value={{ requestPermission, isSupported: isSupported(), permission, showLocalNotification }}>
      {children}
    </PushContext.Provider>
  );
};