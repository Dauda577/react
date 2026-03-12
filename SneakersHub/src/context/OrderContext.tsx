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

    // Trigger payout for verified sellers without subaccount
    if (!isOfficial) {
      triggerRelease(orderId, "immediate").catch((err) =>
        console.warn("Immediate transfer failed:", err)
      );
    }

    // SMS buyer
    await triggerSMS({
      type: "order.shipped",
      record: {
        id: orderId,
        buyer_id: order?.buyerId,
        buyer: order?.buyer,
        total: order?.total,
        items: order?.items,
        ...order,
      }
    });
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