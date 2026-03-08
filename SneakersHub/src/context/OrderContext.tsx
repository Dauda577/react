import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
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
};

type OrderContextType = {
  orders: Order[];
  latestOrder: Order | null;
  unseenCount: number;
  loading: boolean;
  placeOrder: (order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status" | "buyerId"> & { sellerId: string }) => Promise<void>;
  confirmAsSeller: (orderId: string) => Promise<void>;
  confirmAsBuyer: (orderId: string) => Promise<void>;
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
});

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsCache, setItemsCache] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); return; }
    setLoading(true);

    const { data: orderData, error } = await supabase
      .from("orders")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("placed_at", { ascending: false });

    if (error || !orderData) { setLoading(false); return; }

    const orderIds = orderData.map((o: OrderRow) => o.id);
    const { data: itemData } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    const itemsByOrder: Record<string, OrderItemRow[]> = {};
    (itemData as OrderItemRow[] ?? []).forEach((item) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    // Cache items so realtime updates can reuse them
    const newItemsCache: Record<string, OrderItem[]> = {};
    const mapped = (orderData as OrderRow[]).map((row) => {
      const order = rowToOrder(row, itemsByOrder[row.id] ?? []);
      newItemsCache[row.id] = order.items;
      return order;
    });

    setItemsCache(newItemsCache);
    setOrders(mapped);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchOrders(); }, [user?.id]);

  // ── Realtime: in-place updates (no full refetch) ──────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`orders-realtime:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `seller_id=eq.${user.id}`,
      }, async (payload) => {
        // New order came in — fetch its items then prepend
        const newRow = payload.new as OrderRow;
        const { data: itemData } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", newRow.id);

        const items = itemData as OrderItemRow[] ?? [];
        const newOrder = rowToOrder(newRow, items);
        setItemsCache((prev) => ({ ...prev, [newRow.id]: newOrder.items }));
        setOrders((prev) => [newOrder, ...prev]);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `buyer_id=eq.${user.id}`,
      }, async (payload) => {
        const newRow = payload.new as OrderRow;
        const { data: itemData } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", newRow.id);
        const items = itemData as OrderItemRow[] ?? [];
        const newOrder = rowToOrder(newRow, items);
        setItemsCache((prev) => ({ ...prev, [newRow.id]: newOrder.items }));
        setOrders((prev) => {
          if (prev.some((o) => o.id === newRow.id)) return prev;
          return [newOrder, ...prev];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
      }, (payload) => {
        // Status/confirmation changed — update in place using cached items
        const updatedRow = payload.new as OrderRow;
        setOrders((prev) =>
          prev.map((o) =>
            o.id === updatedRow.id
              ? rowToOrder(updatedRow, itemsCache[updatedRow.id]?.map((item) => ({
                  id: item.id,
                  order_id: updatedRow.id,
                  name: item.name,
                  brand: item.brand,
                  image_url: item.image,
                  price: item.price,
                  size: item.size,
                  quantity: item.quantity,
                } as OrderItemRow)) ?? [])
              : o
          )
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, itemsCache]);

  const placeOrder = async (
    order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status" | "buyerId"> & { sellerId: string }
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

    const { data: insertedItems } = await supabase
      .from("order_items")
      .insert(itemsToInsert)
      .select();

    // Optimistic: add to state immediately without waiting for realtime
    const newOrder = rowToOrder(orderRow, insertedItems as OrderItemRow[] ?? []);
    setItemsCache((prev) => ({ ...prev, [orderRow.id]: newOrder.items }));
    setOrders((prev) => [newOrder, ...prev]);

    await triggerSMS({ type: "order.created", record: orderRow });
  };

  const confirmAsSeller = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const newStatus = order?.buyerConfirmed ? "delivered" : "shipped";

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, sellerConfirmed: true, status: newStatus as Order["status"] } : o
      )
    );

    const { error } = await supabase.from("orders").update({
      seller_confirmed: true,
      status: newStatus,
    }).eq("id", orderId);

    if (error) {
      // Revert on failure
      await fetchOrders();
      throw new Error(error.message);
    }

    await triggerSMS({ type: "order.shipped", record: { id: orderId, ...order } });
  };

  const confirmAsBuyer = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const newStatus = order?.sellerConfirmed ? "delivered" : "pending";

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, buyerConfirmed: true, status: newStatus as Order["status"] } : o
      )
    );

    const { error } = await supabase.from("orders").update({
      buyer_confirmed: true,
      status: newStatus,
    }).eq("id", orderId);

    if (error) {
      await fetchOrders();
      throw new Error(error.message);
    }

    await triggerSMS({ type: "order.delivered", record: { id: orderId, ...order } });
  };

  const markOrdersSeen = async () => {
    if (!user) return;
    // Optimistic
    setOrders((prev) =>
      prev.map((o) => (o.sellerId === user.id && !o.seen ? { ...o, seen: true } : o))
    );
    await supabase.from("orders")
      .update({ seen_by_seller: true })
      .eq("seller_id", user.id)
      .eq("seen_by_seller", false);
  };

  const unseenCount = orders.filter((o) => o.sellerId === user?.id && !o.seen).length;
  const latestOrder = orders[0] ?? null;

  return (
    <OrderContext.Provider value={{
      orders, latestOrder, unseenCount, loading,
      placeOrder, confirmAsSeller, confirmAsBuyer, markOrdersSeen, fetchOrders,
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