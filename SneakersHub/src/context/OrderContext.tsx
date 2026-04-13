import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase, OrderRow, OrderItemRow } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { triggerSMS } from "@/lib/sms";
import { toast } from "sonner";

export type DeliveryMethod = "pickup" | "delivery";
export type DeliveryStatus =
  | "pending"
  | "ready_for_pickup"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export type OrderItem = {
  id: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  size: number | string | null;
  quantity: number;
};

export type Order = {
  id: string;
  discountAmount?: number;
  promoCode?: string;
  deliveryMethod?: DeliveryMethod;
  items: OrderItem[];
  buyer: {
    firstName: string; lastName: string; phone: string;
    address: string; city: string; region: string;
  };
  delivery: DeliveryMethod;
  deliveryStatus: DeliveryStatus;
  deliveryLocation?: string;
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
  releaseAt: string | null;
  payoutStatus: "pending" | "released" | "auto_released" | "transfer_failed";
  disputeReason: string | null;
  paystackReference: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  handlingTime: string | null;
  shippingCost: number;
  orderNotes: string | null;
};

type OrderContextType = {
  orders: Order[];
  latestOrder: Order | null;
  unseenCount: number;
  loading: boolean;
  placeOrder: (order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status" | "buyerId" | "releaseAt" | "payoutStatus" | "disputeReason" | "paystackReference"> & { sellerId: string; orderNotes?: string; deliveryStatus?: DeliveryStatus }) => Promise<Order>;
  confirmAsSeller: (orderId: string) => Promise<void>;
  confirmAsBuyer: (orderId: string) => Promise<void>;
  raiseDispute: (orderId: string, reason: string) => Promise<void>;
  markOrdersSeen: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  addTracking: (orderId: string, trackingNumber: string, trackingUrl?: string) => Promise<void>;
  updateDeliveryStatus: (orderId: string, status: DeliveryStatus, deliveryFee?: number, location?: string) => Promise<void>;
};

const OrderContext = createContext<OrderContextType | null>(null);

const rowToOrder = (row: OrderRow, items: OrderItemRow[]): Order => ({
  id: row.id,
  discountAmount: (row as any).discount_amount ?? undefined,
  promoCode: (row as any).promo_code ?? undefined,
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
  delivery: (row.delivery_method as DeliveryMethod) ?? "delivery",
  deliveryStatus: (row.delivery_status as DeliveryStatus) ?? "pending",
  deliveryLocation: (row as any).delivery_location ?? null,
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
  orderNotes: (row as any).order_notes ?? null,
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

          // ── FIX: Wait 1.5s for order_items to be inserted before fetching ──
          // The realtime INSERT fires as soon as the order row is created,
          // but order_items are inserted immediately after. Without the delay
          // we fetch items too early and get an empty array.
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const { data: itemData } = await supabase
            .from("order_items")
            .select("id, order_id, name, brand, price, size, quantity, image_url")
            .eq("order_id", row.id);
          const items = (itemData as OrderItemRow[]) ?? [];

          console.log(`[Realtime INSERT] order ${row.id} — fetched ${items.length} items`);

          setOrders((prev) => {
            // If order was already added by placeOrder() with items, keep it
            const existing = prev.find((o) => o.id === row.id);
            if (existing && existing.items.length > 0) return prev;
            // Otherwise add/replace with fetched items
            const without = prev.filter((o) => o.id !== row.id);
            return [rowToOrder(row, items), ...without];
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[OrderContext] Realtime channel subscribed ✓");
        }
        if (status === "CHANNEL_ERROR") {
          console.error("[OrderContext] Realtime channel error — attempting re-fetch");
          fetchOrders();
        }
        if (status === "TIMED_OUT") {
          console.warn("[OrderContext] Realtime channel timed out — attempting re-fetch");
          fetchOrders();
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchOrders]);

  const placeOrder = async (order: {
    sellerId: string;
    items: { sneakerId?: string; name: string; brand: string; size?: number; price: number; quantity: number; imageUrl?: string; image?: string; id?: string; }[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    deliveryMethod?: DeliveryMethod;
    deliveryStatus?: DeliveryStatus;
    deliveryAddress?: string;
    buyerPhone?: string;
    buyerName?: string;
    paystackReference?: string | null;
    subaccountCode?: string | null;
    orderNotes?: string;
    delivery?: string;
    deliveryInfo?: { label?: string; estimatedCost?: string; days?: string };
    buyer?: { firstName?: string; lastName?: string; phone?: string; address?: string; city?: string; region?: string };
  }) => {
    if (!user) throw new Error("Not authenticated");

    const deliveryMethod = (order.deliveryMethod ?? order.delivery ?? "delivery") as DeliveryMethod;
    const deliveryStatus = order.deliveryStatus ?? "pending";
    const deliveryLabel = order.deliveryInfo?.label ?? (deliveryMethod === "pickup" ? "Store Pickup" : "Delivery");
    const deliveryEstimatedCost = order.deliveryInfo?.estimatedCost ?? (order.deliveryFee === 0 ? "Free" : `GH₵ ${order.deliveryFee}`);
    const deliveryDays = order.deliveryInfo?.days ?? (deliveryMethod === "pickup" ? "Ready in 1-2 days" : "Contact to arrange");

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

    if (order.paystackReference) {
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("paystack_reference", order.paystackReference)
        .maybeSingle();

      if (existingOrder) {
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
      discount_amount: (order as any).discountAmount ?? null,
      promo_code: (order as any).promoCode ?? null,
      delivery_method: deliveryMethod,
      delivery_status: deliveryStatus,
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
      order_notes: order.orderNotes ?? null,
      status: "pending",
      seller_confirmed: false,
      buyer_confirmed: false,
    }).select().single();

    if (error) {
      console.error("Order insertion error:", error);
      throw new Error(error.message);
    }

    console.log(`[placeOrder] Order created: ${orderRow.id} — inserting ${order.items.length} items`);

    const itemsToInsert = order.items.map((item) => ({
      order_id: orderRow.id,
      listing_id: item.sneakerId ?? item.id ?? null,
      name: item.name,
      brand: item.brand,
      image_url: item.imageUrl ?? item.image ?? null,
      price: item.price,
      size: item.size != null ? String(item.size) : null,
      quantity: item.quantity,
    }));

    console.log("[placeOrder] Items to insert:", JSON.stringify(itemsToInsert));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsToInsert)
      .select();

    console.log("[placeOrder] Items insert result — data:", insertedItems, "error:", itemsError);

    if (itemsError) {
      console.error("[placeOrder] ITEMS INSERT FAILED:", itemsError);
      // Order was created but items failed — still return order so payment isn't lost
      // Admin will need to manually fix this order
      toast.error("Order placed but item details failed to save. Contact support.");
    }

    const insertedRows = (insertedItems as OrderItemRow[]) ?? [];
    const newOrder = rowToOrder(orderRow, insertedRows);

    // ── FIX: Always upsert into state so realtime early-add doesn't win ──
    setOrders((prev) => {
      const without = prev.filter((o) => o.id !== orderRow.id);
      return [newOrder, ...without];
    });

    await triggerSMS({
      type: "order.created",
      record: {
        ...orderRow,
        items: order.items,
        buyer_phone: buyerPhone,
        delivery_method: deliveryMethod,
        delivery_status: deliveryStatus,
      }
    });

    await triggerSMS({
      type: "order.seller_notified",
      record: {
        seller_id: order.sellerId,
        listing_name: order.items[0]?.name ?? "your listing",
        total: order.total,
        id: orderRow.id,
      }
    }).catch((err) => console.warn("Seller SMS failed (non-fatal):", err));

    try {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .eq("user_id", order.sellerId);

      if (subscriptions && subscriptions.length > 0) {
        const itemNames = order.items.map(i => i.name).join(", ");
        const totalAmount = order.total;

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
              body: `${deliveryMethod === "pickup" ? "Pickup" : "Delivery"} Order: GH₵ ${totalAmount} - ${itemNames.substring(0, 50)}${itemNames.length > 50 ? '...' : ''}`,
              url: "/account?tab=orders",
              icon: "/icon-192.png",
              badge: "/badge-72.png",
              data: {
                orderId: orderRow.id,
                timestamp: new Date().toISOString(),
                deliveryMethod: deliveryMethod,
                deliveryStatus: deliveryStatus,
              }
            })
          }).catch(err => console.warn("Push send failed:", err));
        }
      }
    } catch (err) {
      console.warn("Failed to send push notifications:", err);
    }

    return newOrder;
  };

  const updateDeliveryStatus = async (orderId: string, status: DeliveryStatus, deliveryFee?: number, location?: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.sellerId !== user?.id) {
      toast.error("Unauthorized - Only the seller can update delivery status");
      return;
    }

    const updates: any = { delivery_status: status };
    if (deliveryFee !== undefined) updates.delivery_fee = deliveryFee;
    if (location !== undefined) updates.delivery_location = location;

    setOrders((prev) =>
      prev.map((o) => o.id === orderId
        ? {
          ...o,
          deliveryStatus: status,
          deliveryFee: deliveryFee ?? o.deliveryFee,
          deliveryLocation: location ?? (o as any).deliveryLocation
        }
        : o
      )
    );

    await supabase.from("orders").update(updates).eq("id", orderId);

    await triggerSMS({
      type: "order.delivery_update",
      record: {
        id: orderId,
        buyer_id: order.buyerId,
        buyer: order.buyer,
        delivery_status: status,
        delivery_fee: deliveryFee,
        ...order,
      }
    });

    toast.success(`Delivery status updated to ${status}`);
  };

  const confirmAsSeller = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);

    if (!order || order.sellerId !== user?.id) {
      toast.error("Unauthorized action");
      return;
    }

    const newStatus = order?.buyerConfirmed ? "delivered" : "shipped";

    const { data: sellerProfile } = await supabase
      .from("profiles").select("is_official").eq("id", order?.sellerId ?? "").single();
    const isOfficial = sellerProfile?.is_official ?? false;

    setOrders((prev) =>
      prev.map((o) => o.id === orderId
        ? {
          ...o, sellerConfirmed: true, status: newStatus as Order["status"],
          payoutStatus: isOfficial ? "released" : "pending"
        }
        : o)
    );

    await supabase.from("orders").update({
      seller_confirmed: true,
      status: newStatus,
      payout_status: isOfficial ? "released" : "pending",
    }).eq("id", orderId);

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

    if (!isOfficial) {
      triggerRelease(orderId, "immediate").catch((err) =>
        console.warn("Immediate transfer failed:", err)
      );
    }

    await triggerSMS({
      type: "order.shipped",
      record: {
        id: orderId,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        buyer_phone: order?.buyer?.phone,
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

    if (!order || order.buyerId !== user?.id) {
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
      delivered_at: newStatus === "delivered" ? new Date().toISOString() : null,
    }).eq("id", orderId);

    if (error) { await fetchOrders(); throw new Error(error.message); }

    await triggerSMS({
      type: "order.delivered",
      record: {
        id: orderId,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        buyer_phone: order?.buyer?.phone,
        ...order,
      }
    });
  };

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
      markOrdersSeen, fetchOrders, updateDeliveryStatus,
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