import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase, OrderRow, OrderItemRow } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { triggerSMS } from "@/lib/sms";

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
  releaseAt: string | null;
  payoutStatus: "pending" | "released" | "disputed" | "auto_released";
  disputeReason: string | null;
  paystackReference: string | null;
};

type OrderContextType = {
  orders: Order[];
  latestOrder: Order | null;
  unseenCount: number;
  loading: boolean;
  placeOrder: (order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status" | "buyerId" | "releaseAt" | "payoutStatus" | "disputeReason" | "paystackReference"> & { sellerId: string }) => Promise<void>;
  confirmAsSeller: (orderId: string) => Promise<void>;
  confirmAsBuyer: (orderId: string) => Promise<void>;
  raiseDispute: (orderId: string, reason: string) => Promise<void>;
  markOrdersSeen: () => Promise<void>;
  fetchOrders: () => Promise<void>;
};

const OrderContext = createContext<OrderContextType | null>(null);

const AUTO_RELEASE_DAYS = 3;

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
            .from("order_items").select("*").eq("order_id", row.id);
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
      .subscribe((status) => console.log("[Orders] realtime:", status));

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const placeOrder = async (
    order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status" | "buyerId" | "releaseAt" | "payoutStatus" | "disputeReason" | "paystackReference"> & { sellerId: string }
  ) => {
    if (!user) throw new Error("Not authenticated");

    const { data: orderRow, error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      seller_id: order.sellerId,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      total: order.total,
      delivery_method: order.delivery,
      delivery_label: order.deliveryInfo.label,
      delivery_estimated_cost: order.deliveryInfo.estimatedCost,
      delivery_days: order.deliveryInfo.days,
      buyer_first_name: order.buyer.firstName,
      buyer_last_name: order.buyer.lastName,
      buyer_phone: order.buyer.phone,
      buyer_address: order.buyer.address,
      buyer_city: order.buyer.city,
      buyer_region: order.buyer.region,
      payout_status: "pending",
    }).select().single();

    if (error) throw new Error(error.message);

    const itemsToInsert = order.items.map((item) => ({
      order_id: orderRow.id,
      name: item.name,
      brand: item.brand,
      image_url: item.image,
      price: item.price,
      size: item.size,
      quantity: item.quantity,
    }));

    const { data: insertedItems } = await supabase.from("order_items").insert(itemsToInsert).select();
    const insertedRows = (insertedItems as OrderItemRow[]) ?? [];

    setOrders((prev) => {
      if (prev.some((o) => o.id === orderRow.id)) return prev;
      return [rowToOrder(orderRow, insertedRows), ...prev];
    });

    await triggerSMS({
      type: "order.created",
      record: {
        ...orderRow,
        items: order.items,
      }
    });
  };

  const confirmAsSeller = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const newStatus = order?.buyerConfirmed ? "delivered" : "shipped";

    // Check if seller is official — official sellers bypass escrow entirely
    const { data: sellerProfile } = await supabase
      .from("profiles").select("is_official").eq("id", order?.sellerId ?? "").single();
    const isOfficial = sellerProfile?.is_official ?? false;

    // Only set release_at for non-official sellers
    const releaseAt = isOfficial
      ? null
      : new Date(Date.now() + AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    setOrders((prev) =>
      prev.map((o) => o.id === orderId
        ? { ...o, sellerConfirmed: true, status: newStatus as Order["status"], releaseAt,
            payoutStatus: isOfficial ? "released" : o.payoutStatus }
        : o)
    );

    const updatePayload: Record<string, any> = {
      seller_confirmed: true,
      status: newStatus,
    };
    if (!isOfficial) updatePayload.release_at = releaseAt;
    if (isOfficial) updatePayload.payout_status = "released"; // official = direct sale, mark immediately

    const { error } = await supabase.from("orders").update(updatePayload).eq("id", orderId);
    if (error) { await fetchOrders(); throw new Error(error.message); }

    await triggerSMS({
      type: "order.shipped",
      record: {
        id: orderId,
        release_at: releaseAt,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        ...order,
      }
    });

    // If buyer already confirmed AND seller is not official, trigger escrow release
    if (order?.buyerConfirmed && !isOfficial) {
      await triggerRelease(orderId, "immediate");
    }
  };

  const confirmAsBuyer = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
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

    await triggerSMS({
      type: "order.delivered",
      record: {
        id: orderId,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        ...order,
      }
    });

    // If seller already confirmed, trigger immediate payment release
    if (order?.sellerConfirmed) {
      await triggerRelease(orderId, "immediate");
    }
  };

  // ── Trigger payment release ───────────────────────────────────────────────
  const triggerRelease = async (orderId: string, trigger: "immediate" | "auto") => {
    try {
      const { error } = await supabase.functions.invoke("release-payment", {
        body: { order_id: orderId, trigger },
      });
      if (error) console.warn("Payment release failed (non-fatal):", error);
    } catch (err) {
      console.warn("Payment release error (non-fatal):", err);
    }
  };

  // ── Raise a dispute ───────────────────────────────────────────────────────
  const raiseDispute = async (orderId: string, reason: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Order not found");

    // Can only dispute within 3 days of seller confirming
    if (order.releaseAt) {
      const releaseDate = new Date(order.releaseAt);
      if (new Date() > releaseDate) {
        throw new Error("Dispute window has closed — funds have been auto-released");
      }
    }

    setOrders((prev) =>
      prev.map((o) => o.id === orderId
        ? { ...o, payoutStatus: "disputed", disputeReason: reason }
        : o)
    );

    const { error } = await supabase.from("orders").update({
      payout_status: "disputed",
      dispute_reason: reason,
    }).eq("id", orderId);

    if (error) { await fetchOrders(); throw new Error(error.message); }

    // Notify you (the admin) via SMS that a dispute was raised
    // Uses seller_id as a proxy — you'll need to handle this manually
    console.log(`Dispute raised for order ${orderId}: ${reason}`);
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
      placeOrder, confirmAsSeller, confirmAsBuyer, raiseDispute,
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