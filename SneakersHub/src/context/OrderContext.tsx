import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
};

type OrderContextType = {
  orders: Order[];
  latestOrder: Order | null;
  unseenCount: number;
  loading: boolean;
  placeOrder: (order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status"> & { sellerId: string }) => Promise<void>;
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
});

export const OrderProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
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

    setOrders((orderData as OrderRow[]).map((row) => rowToOrder(row, itemsByOrder[row.id] ?? [])));
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "orders",
      }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const placeOrder = async (
    order: Omit<Order, "id" | "placedAt" | "seen" | "sellerConfirmed" | "buyerConfirmed" | "status"> & { sellerId: string }
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

    await supabase.from("order_items").insert(itemsToInsert);

    // SMS: notify seller of new order
    await triggerSMS({ type: "order.created", record: orderRow });

    await fetchOrders();
  };

  const confirmAsSeller = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const newStatus = order?.buyerConfirmed ? "delivered" : "shipped";

    const { error } = await supabase.from("orders").update({
      seller_confirmed: true,
      status: newStatus,
    }).eq("id", orderId);

    if (error) throw new Error(error.message);

    // SMS: notify buyer that order is shipped
    await triggerSMS({ type: "order.shipped", record: { id: orderId, ...order } });

    await fetchOrders();
  };

  const confirmAsBuyer = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    const newStatus = order?.sellerConfirmed ? "delivered" : "pending";

    const { error } = await supabase.from("orders").update({
      buyer_confirmed: true,
      status: newStatus,
    }).eq("id", orderId);

    if (error) throw new Error(error.message);

    // SMS: notify buyer of delivery confirmation
    await triggerSMS({ type: "order.delivered", record: { id: orderId, ...order } });

    await fetchOrders();
  };

  const markOrdersSeen = async () => {
    if (!user) return;
    await supabase.from("orders")
      .update({ seen_by_seller: true })
      .eq("seller_id", user.id)
      .eq("seen_by_seller", false);
    await fetchOrders();
  };

  const unseenCount = orders.filter((o) => !o.seen).length;
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