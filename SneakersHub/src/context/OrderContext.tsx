import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase, OrderRow, OrderItemRow } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { triggerSMS } from "@/lib/sms";
import { toast } from "sonner";

export type OrderItem = {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  size: number;
  quantity: number;
};

export type Order = {
  id: string;
  items: OrderItem[];
  buyer: {
    firstName: string; lastName: string; phone: string;
    address: string; city: string; region: string;
  };
  delivery: string;
  deliveryInfo: { label: string; estimatedCost: string; days: string };
  subtotal: number;
  deliveryFee: number;
  total: number;
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
  status: "pending" | "shipped" | "delivered";
  placedAt: string;
  seen: boolean;
  sellerId: string;
  buyerId: string;
  // Escrow fields
  releaseAt: string | null; // kept for DB compat
  payoutStatus: "pending" | "released" | "auto_released" | "transfer_failed";
  disputeReason: string | null; // kept for DB compat
  paystackReference: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  handlingTime: string | null;
  shippingCost: number;
};

type OrderContextType = {
  orders: Order[];
  latestOrder: Order | null;
  unseenCount: number;
  loading: boolean;
  placeOrder: (order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status" | "buyerId" | "releaseAt" | "payoutStatus" | "disputeReason" | "paystackReference"> & { sellerId: string }) => Promise<Order>;
  confirmAsSeller: (orderId: string) => Promise<void>;
  confirmAsBuyer: (orderId: string) => Promise<void>;
  raiseDispute: (orderId: string, reason: string) => Promise<void>;
  markOrdersSeen: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  addTracking: (orderId: string, trackingNumber: string, trackingUrl?: string) => Promise<void>;
};

const OrderContext = createContext<OrderContextType | null>(null);


const rowToOrder = (row: OrderRow, items: OrderItemRow[]): Order => ({
  id: row.id,
  items: items.map((i) => ({
    id: i.id,
    name: i.name,
    brand: i.brand ?? "",
    image: i.image_url ?? "",
    price: i.price,
    size: i.size ?? 0,
    quantity: i.quantity,
  })),
  buyer: {
    firstName: row.buyer_first_name,
    lastName: row.buyer_last_name,
    phone: row.buyer_phone,
    address: row.buyer_address,
    city: row.buyer_city,
    region: row.buyer_region,
  },
  delivery: row.delivery_method ?? "",
  deliveryInfo: {
    label: row.delivery_label ?? "",
    estimatedCost: row.delivery_estimated_cost ?? "",
    days: row.delivery_days ?? "",
  },
  subtotal: row.subtotal,
  deliveryFee: row.delivery_fee,
  total: row.total,
  sellerConfirmed: row.seller_confirmed,
  buyerConfirmed: row.buyer_confirmed,
  status: row.status,
  placedAt: row.placed_at,
  seen: row.seen_by_seller,
  sellerId: row.seller_id,
  buyerId: row.buyer_id,
  releaseAt: (row as any).release_at ?? null,
  payoutStatus: (row as any).payout_status ?? "pending",
  disputeReason: (row as any).dispute_reason ?? null,
  paystackReference: (row as any).paystack_reference ?? null,
  trackingNumber: (row as any).tracking_number ?? null,
  trackingUrl: (row as any).tracking_url ?? null,
  handlingTime: (row as any).handling_time ?? null,
  shippingCost: (row as any).shipping_cost ?? 0,
});

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const ordersRef = useRef<Order[]>([]);

  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items (*)`)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("placed_at", { ascending: false });

    if (error || !data) { setLoading(false); return; }

    setOrders(data.map((row: any) => rowToOrder(row as OrderRow, row.order_items ?? [])));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchOrders(); }, [user?.id]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`orders:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        async (payload) => {
          const row = payload.new as OrderRow;
          if (row.buyer_id !== user.id && row.seller_id !== user.id) return;
          if (ordersRef.current.some((o) => o.id === row.id)) return;

          const { data: itemData } = await supabase
            .from("order_items").select("id, order_id, name, brand, price, size, quantity, image_url").eq("order_id", row.id);
          const items = (itemData as OrderItemRow[]) ?? [];
          setOrders((prev) => {
            if (prev.some((o) => o.id === row.id)) return prev;
            return [rowToOrder(row, items), ...prev];
          });
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as OrderRow;
          if (row.buyer_id !== user.id && row.seller_id !== user.id) return;
          setOrders((prev) =>
            prev.map((o) => {
              if (o.id !== row.id) return o;
              const existingItems: OrderItemRow[] = o.items.map((item) => ({
                id: item.id,
                order_id: row.id,
                listing_id: null,
                name: item.name,
                brand: item.brand ?? null,
                image_url: item.image ?? null,
                price: item.price,
                size: item.size ?? null,
                quantity: item.quantity,
              }));
              return rowToOrder(row, existingItems);
            })
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const placeOrder = async (order: {
    sellerId: string;
    items: { sneakerId?: string; name: string; brand: string; size?: number; price: number; quantity: number; imageUrl?: string; image?: string; id?: string; }[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    deliveryMethod?: string;
    deliveryAddress?: string;
    buyerPhone?: string;
    buyerName?: string;
    paystackReference?: string | null;
    subaccountCode?: string | null;
    // also accept nested shapes for backwards compat
    delivery?: string;
    deliveryInfo?: { label?: string; estimatedCost?: string; days?: string };
    buyer?: { firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; region?: string };
  }) => {
    if (!user) throw new Error("Not authenticated");

    // Normalise flat vs nested shapes
    const deliveryMethod = order.deliveryMethod ?? order.delivery ?? "";
    const deliveryLabel = order.deliveryInfo?.label ?? (deliveryMethod === "express" ? "Express Delivery" : deliveryMethod === "pickup" ? "Hub Pickup" : "Standard Delivery");
    const deliveryEstimatedCost = order.deliveryInfo?.estimatedCost ?? (order.deliveryFee === 0 ? "Free" : `GHS ${order.deliveryFee}`);
    const deliveryDays = order.deliveryInfo?.days ?? "";
    const [buyerFirstName, ...rest] = (order.buyerName ?? `${order.buyer?.firstName ?? ""} ${order.buyer?.lastName ?? ""}`.trim()).split(" ");
    const buyerLastName = rest.join(" ");
    const buyerPhone = order.buyerPhone ?? order.buyer?.phone ?? "";
    const [buyerAddress, buyerCity, buyerRegion] = (() => {
      if (order.deliveryAddress) {
        const parts = order.deliveryAddress.split(", ");
        return [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
      }
      return [order.buyer?.address ?? "", order.buyer?.city ?? "", order.buyer?.region ?? ""];
    })();

    // Check if order already exists with this reference (for recovery)
    if (order.paystackReference) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("paystack_reference", order.paystackReference)
        .maybeSingle();

      if (existingOrder) {
        // Order already exists - fetch and return it
        const { data: fullOrder } = await supabase
          .from("orders")
          .select(`*, order_items (*)`)
          .eq("id", existingOrder.id)
          .single();

        if (fullOrder) {
          const { data: itemData } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", existingOrder.id);
          
          const items = (itemData as OrderItemRow[]) ?? [];
          const orderObj = rowToOrder(fullOrder as OrderRow, items);
          
          setOrders((prev) => {
            if (prev.some((o) => o.id === orderObj.id)) return prev;
            return [orderObj, ...prev];
          });

          return orderObj;
        }
      }
    }

    const { data: orderRow, error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      seller_id: order.sellerId,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      total: order.total,
      delivery_method: deliveryMethod,
      delivery_label: deliveryLabel,
      delivery_estimated_cost: deliveryEstimatedCost,
      delivery_days: deliveryDays,
      buyer_first_name: buyerFirstName ?? "",
      buyer_last_name: buyerLastName ?? "",
      buyer_phone: buyerPhone,
      buyer_address: buyerAddress,
      buyer_city: buyerCity,
      buyer_region: buyerRegion,
      payout_status: "pending",
      paystack_reference: order.paystackReference ?? null,
    }).select().single();

    if (error) throw new Error(error.message);

    const itemsToInsert = order.items.map((item) => ({
      order_id: orderRow.id,
      name: item.name,
      brand: item.brand,
      image_url: item.imageUrl ?? item.image ?? null,
      price: item.price,
      size: item.size ?? item.sneakerId ?? null,
      quantity: item.quantity,
    }));

    const { data: insertedItems } = await supabase.from("order_items").insert(itemsToInsert).select();
    const insertedRows = (insertedItems as OrderItemRow[]) ?? [];

    const newOrder = rowToOrder(orderRow, insertedRows);

    setOrders((prev) => {
      if (prev.some((o) => o.id === orderRow.id)) return prev;
      return [newOrder, ...prev];
    });

    // ✅ FIXED: Added buyer_phone to SMS trigger
    await triggerSMS({
      type: "order.created",
      record: {
        ...orderRow,
        items: order.items,
        buyer_phone: buyerPhone, // Add phone number
      }
    });

    // ── Send push notification to seller if they have subscriptions ─────────
    try {
      // Get seller's push subscription
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", order.sellerId);

      if (subscriptions && subscriptions.length > 0) {
        // Format order items for the notification
        const itemNames = order.items.map(i => i.name).join(", ");
        const totalAmount = order.total;
        
        // Send push notification to each subscription
        const { data: { session } } = await supabase.auth.getSession();
        
        for (const sub of subscriptions) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.access_token}`,
              "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              subscription: sub.subscription,
              title: "🛍️ New Order Received!",
              body: `GHS ${totalAmount} - ${itemNames.substring(0, 50)}${itemNames.length > 50 ? '...' : ''}`,
              url: "/account?tab=orders",
              icon: "/icon-192.png",
              badge: "/badge-72.png",
              data: {
                orderId: orderRow.id,
                timestamp: new Date().toISOString()
              }
            })
          }).catch(err => console.warn("Push send failed:", err));
        }
      }
    } catch (err) {
      console.warn("Failed to send push notifications:", err);
      // Non-fatal - don't block order completion
    }

    return newOrder;
  };

  const confirmAsSeller = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);

    // ── Ownership check: caller must be the seller of this order ──
    if (!order || order.sellerId !== user?.id) {
      console.error("[confirmAsSeller] Unauthorized — caller is not the seller of this order");
      toast.error("Unauthorized action");
      return;
    }

    const newStatus = order?.buyerConfirmed ? "delivered" : "shipped";

    // Check if seller is official
    const { data: sellerProfile } = await supabase
      .from("profiles").select("is_official").eq("id", order?.sellerId ?? "").single();
    const isOfficial = sellerProfile?.is_official ?? false;

    setOrders((prev) =>
      prev.map((o) => o.id === orderId
        ? { ...o, sellerConfirmed: true, status: newStatus as Order["status"],
            payoutStatus: isOfficial ? "released" : "pending" }
        : o)
    );

    await supabase.from("orders").update({
      seller_confirmed: true,
      status: newStatus,
      payout_status: isOfficial ? "released" : "pending",
    }).eq("id", orderId);

    // Record payout history
    const { data: sellerProfile2 } = await supabase
      .from("profiles").select("commission_rate").eq("id", order.sellerId).single();
    const commRate = sellerProfile2?.commission_rate ?? 5;
    const commAmount = order.total * commRate / 100;
    await supabase.from("payout_history").insert({
      seller_id: order.sellerId,
      order_id: orderId,
      gross_amount: order.total,
      commission_rate: commRate,
      commission_amount: commAmount,
      net_amount: order.total - commAmount,
      status: "paid",
      paid_at: new Date().toISOString(),
    });

    // Trigger payout for verified sellers without subaccount
    if (!isOfficial) {
      triggerRelease(orderId, "immediate").catch((err) =>
        console.warn("Immediate transfer failed:", err)
      );
    }

    // ✅ FIXED: Added buyer_phone to SMS trigger
    await triggerSMS({
      type: "order.shipped",
      record: {
        id: orderId,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        buyer_phone: order?.buyer?.phone, // Add phone number
        ...order,
      }
    });
  };

  const addTracking = async (orderId: string, trackingNumber: string, trackingUrl?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.sellerId !== user?.id) { toast.error("Unauthorized"); return; }
    setOrders((prev) => prev.map((o) => o.id === orderId
      ? { ...o, trackingNumber, trackingUrl: trackingUrl ?? null }
      : o
    ));
    await supabase.from("orders").update({
      tracking_number: trackingNumber,
      tracking_url: trackingUrl ?? null,
    }).eq("id", orderId);
    toast.success("Tracking number saved — buyer can now track their order.");
  };

  const confirmAsBuyer = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);

    // ── Ownership check: caller must be the buyer of this order ──
    if (!order || order.buyerId !== user?.id) {
      console.error("[confirmAsBuyer] Unauthorized — caller is not the buyer of this order");
      toast.error("Unauthorized action");
      return;
    }
    const newStatus = order?.sellerConfirmed ? "delivered" : "pending";

    setOrders((prev) =>
      prev.map((o) => o.id === orderId
        ? { ...o, buyerConfirmed: true, status: newStatus as Order["status"] }
        : o)
    );

    const { error } = await supabase.from("orders").update({
      buyer_confirmed: true,
      status: newStatus,
    }).eq("id", orderId);

    if (error) { await fetchOrders(); throw new Error(error.message); }

    // ✅ FIXED: Added buyer_phone to SMS trigger
    await triggerSMS({
      type: "order.delivered",
      record: {
        id: orderId,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        buyer_phone: order?.buyer?.phone, // Add phone number
        ...order,
      }
    });

    // Payment already transferred when seller confirmed dispatch
    // No additional release needed
  };

  // ── Trigger payment release ───────────────────────────────────────────────
  const triggerRelease = async (orderId: string, trigger: "immediate" | "auto") => {
    try {
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/release-payment`;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ order_id: orderId, trigger, caller_id: user?.id }),
      });
      if (!res.ok) console.warn("Payment release failed (non-fatal):", await res.text());
    } catch (err) {
      console.warn("Payment release error (non-fatal):", err);
    }
  };

  // ── Disputes removed — payments transfer immediately on dispatch ─────────
  const raiseDispute = async (_orderId: string, _reason: string) => {
    throw new Error("Disputes are not available — payment was transferred when the seller dispatched your order. Please contact support directly.");
  };

  const markOrdersSeen = async () => {
    if (!user) return;
    setOrders((prev) => prev.map((o) => o.sellerId === user.id ? { ...o, seen: true } : o));
    await supabase.from("orders").update({ seen_by_seller: true }).eq("seller_id", user.id).eq("seen_by_seller", false);
  };

  const unseenCount = orders.filter((o) => o.sellerId === user?.id && !o.seen).length;
  const latestOrder = orders[0] ?? null;

  return (
    <OrderContext.Provider value={{
      orders, latestOrder, unseenCount, loading,
      placeOrder, confirmAsSeller, confirmAsBuyer, raiseDispute, addTracking,
      markOrdersSeen, fetchOrders,
    }}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside OrderProvider");
  return ctx;
};