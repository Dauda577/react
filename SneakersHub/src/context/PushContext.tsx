import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Permission = "granted" | "denied" | "default";

interface PushContextType {
  requestPermission: () => Promise<boolean>;
  isSupported: boolean;
  permission: Permission;
  showLocalNotification: (title: string, body: string, url?: string) => void;
}

const PushContext = createContext<PushContextType | null>(null);

export const usePush = () => {
  const ctx = useContext(PushContext);
  if (!ctx) throw new Error("usePush must be used within PushProvider");
  return ctx;
};

// SAFER Notification API detection (Safari-safe)
const getNotificationAPI = (): any => {
  try {
    if (typeof window === "undefined") return null;

    // Safari-safe existence check
    if (!("Notification" in window)) return null;

    const api = (window as any).Notification;

    if (typeof api !== "function") return null;

    return api;
  } catch {
    return null;
  }
};

const checkSupported = () => getNotificationAPI() !== null;

const getPermission = (): Permission => {
  try {
    const api = getNotificationAPI();
    if (!api) return "denied";
    return api.permission ?? "default";
  } catch {
    return "denied";
  }
};

export const PushProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const channelsRef = useRef<any[]>([]);
  const permission: Permission = getPermission();

  const getOrderSummary = async (orderId: string): Promise<string> => {
    try {
      const { data } = await supabase
        .from("order_items")
        .select("name, quantity")
        .eq("order_id", orderId);
      if (!data || data.length === 0) return "your order";
      const parts = data.map((i: any) =>
        i.quantity > 1 ? `${i.name} (x${i.quantity})` : i.name
      );
      if (parts.length === 1) return parts[0];
      if (parts.length === 2) return parts.join(" & ");
      return `${parts[0]} + ${parts.length - 1} more`;
    } catch {
      return "your order";
    }
  };

  const showLocalNotification = (title: string, body: string, url = "/account") => {
    try {
      const api = getNotificationAPI();
      if (!api || api.permission !== "granted") return;

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
          .catch(() => {
            try {
              new api(title, { body, icon: "/icons/icon-192.png" });
            } catch {}
          });
      } else {
        try {
          new api(title, { body, icon: "/icons/icon-192.png" });
        } catch {}
      }
    } catch {}
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      const api = getNotificationAPI();
      if (!api) return false;
      if (api.permission === "granted") return true;
      if (api.permission === "denied") return false;
      const result = await api.requestPermission();
      return result === "granted";
    } catch {
      return false;
    }
  };

  const clearChannels = () => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  };

  useEffect(() => {
    const api = getNotificationAPI();

    // HARD SAFETY GUARD
    if (!user?.id || !api || api.permission !== "granted") return;

    const t = setTimeout(async () => {
      clearChannels();

      if (user.role === "seller") {
        const verifiedCh = supabase
          .channel(`push:verified:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${user.id}`,
            },
            (payload: any) => {
              if (!payload.old?.verified && payload.new?.verified) {
                showLocalNotification(
                  "✅ Account Verified!",
                  "Your SneakersHub seller account is now verified.",
                  "/account"
                );
              }
            }
          )
          .subscribe();

        channelsRef.current.push(verifiedCh);

        const listingCh = supabase
          .channel(`push:listings:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "listings",
              filter: `seller_id=eq.${user.id}`,
            },
            (payload: any) => {
              const name = payload.new?.name ?? "Your listing";
              showLocalNotification(
                "✅ Listing Published!",
                `"${name}" is now live on SneakersHub.`,
                "/account"
              );
            }
          )
          .subscribe();

        channelsRef.current.push(listingCh);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_official")
          .eq("id", user.id)
          .single();

        if (profileData?.is_official) {
          const disputeCh = supabase
            .channel(`push:disputes:${user.id}`)
            .on(
              "postgres_changes",
              { event: "UPDATE", schema: "public", table: "orders" },
              async (payload: any) => {
                if (payload.new.payout_status !== "disputed") return;

                const orderId = (() => {
                  const num =
                    parseInt(payload.new.id.replace(/-/g, "").slice(0, 10), 16) %
                    1000000000;
                  return `#${num.toString().padStart(9, "0")}`;
                })();

                const items = await getOrderSummary(payload.new.id);

                showLocalNotification(
                  `⚠️ Dispute — ${orderId}`,
                  `${items} — GHS ${payload.new.total}. Review in admin.`,
                  "/admin"
                );
              }
            )
            .subscribe();

          channelsRef.current.push(disputeCh);
        }

        if (localStorage.getItem("notif_orders") !== "false") {
          const orderCh = supabase
            .channel(`push:orders:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "orders",
                filter: `seller_id=eq.${user.id}`,
              },
              async (payload: any) => {
                const items = await getOrderSummary(payload.new.id);

                const orderId = (() => {
                  const num =
                    parseInt(payload.new.id.replace(/-/g, "").slice(0, 10), 16) %
                    1000000000;
                  return `#${num.toString().padStart(9, "0")}`;
                })();

                showLocalNotification(
                  `🛒 New Order ${orderId}`,
                  `${items} — GHS ${payload.new.total}`,
                  "/account"
                );
              }
            )
            .subscribe();

          channelsRef.current.push(orderCh);
        }

        if (localStorage.getItem("notif_messages") !== "false") {
          const msgCh = supabase
            .channel(`push:seller:msgs:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `receiver_id=eq.${user.id}`,
              },
              (payload: any) => {
                const content: string = payload.new.content ?? "";
                showLocalNotification(
                  "💬 New Message",
                  content.length > 60
                    ? content.slice(0, 60) + "..."
                    : content,
                  "/account"
                );
              }
            )
            .subscribe();

          channelsRef.current.push(msgCh);
        }
      }

      if (user.role === "buyer") {
        if (localStorage.getItem("notif_orders") !== "false") {
          const orderCh = supabase
            .channel(`push:buyer:orders:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "UPDATE",
                schema: "public",
                table: "orders",
                filter: `buyer_id=eq.${user.id}`,
              },
              (payload: any) => {
                const { status } = payload.new;

                const orderId = (() => {
                  const num =
                    parseInt(payload.new.id.replace(/-/g, "").slice(0, 10), 16) %
                    1000000000;
                  return `#${num.toString().padStart(9, "0")}`;
                })();

                if (status === "shipped") {
                  getOrderSummary(payload.new.id).then((items) => {
                    showLocalNotification(
                      `📦 Order ${orderId} Shipped!`,
                      `${items} — GHS ${payload.new.total} is on its way.`,
                      "/account"
                    );
                  });
                } else if (status === "delivered") {
                  getOrderSummary(payload.new.id).then((items) => {
                    showLocalNotification(
                      `✅ Order ${orderId} Confirmed!`,
                      `${items} — GHS ${payload.new.total}. Enjoy your kicks! 👟`,
                      "/account"
                    );
                  });
                }
              }
            )
            .subscribe();

          channelsRef.current.push(orderCh);
        }

        if (localStorage.getItem("notif_messages") !== "false") {
          const msgCh = supabase
            .channel(`push:buyer:msgs:${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `receiver_id=eq.${user.id}`,
              },
              (payload: any) => {
                const content: string = payload.new.content ?? "";
                showLocalNotification(
                  "💬 New Message",
                  content.length > 60
                    ? content.slice(0, 60) + "..."
                    : content,
                  "/account"
                );
              }
            )
            .subscribe();

          channelsRef.current.push(msgCh);
        }
      }
    }, 3000);

    return () => {
      clearTimeout(t);
      clearChannels();
    };
  }, [user?.id, user?.role]);

  return (
    <PushContext.Provider
      value={{
        requestPermission,
        isSupported: checkSupported(),
        permission,
        showLocalNotification,
      }}
    >
      {children}
    </PushContext.Provider>
  );
};