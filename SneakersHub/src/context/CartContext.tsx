import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export type CartItem = {
  sneaker: {
    id: string;
    name: string;
    brand: string;
    price: number;
    image: string;
    sellerId: string;
    sellerName: string;
    sellerVerified: boolean;
    sellerIsOfficial: boolean;
    sellerSubaccountCode: string | null;
    sellerCity: string | null;
    sellerRegion: string | null;
    shippingCost: number;
    handlingTime: string;
  };
  size: number;
  quantity: number;
};

// Group cart items by seller for multi-seller checkout
export type SellerGroup = {
  sellerId: string;
  sellerName: string;
  sellerVerified: boolean;
  sellerIsOfficial: boolean;
  sellerSubaccountCode: string | null;
  sellerCity: string | null;
  sellerRegion: string | null;
  tier: "official" | "verified" | "standard";
  shippingCost: number;
  handlingTime: string;
  items: CartItem[];
  total: number;
};

export function groupBySeller(items: CartItem[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();
  for (const item of items) {
    const { sellerId, sellerName, sellerVerified, sellerIsOfficial, sellerSubaccountCode, sellerCity, sellerRegion, shippingCost, handlingTime } = item.sneaker;
    const tier = sellerIsOfficial ? "official" : sellerVerified ? "verified" : "standard";
    if (!map.has(sellerId)) {
      map.set(sellerId, {
        sellerId, sellerName, sellerVerified, sellerIsOfficial,
        sellerSubaccountCode: sellerSubaccountCode ?? null,
        sellerCity: sellerCity ?? null,
        sellerRegion: sellerRegion ?? null,
        tier,
        shippingCost: shippingCost ?? 0,
        handlingTime: handlingTime ?? "Ships in 1-3 days",
        items: [], total: 0,
      });
    }
    const group = map.get(sellerId)!;
    group.items.push(item);
    group.total += item.sneaker.price * item.quantity;
  }
  return Array.from(map.values());
}

type CartContextType = {
  items: CartItem[];
  addItem: (sneaker: CartItem["sneaker"], size: number) => void;
  removeItem: (id: string, size: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "sneakershub-cart";

const loadFromStorage = (): CartItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: CartItem[] = JSON.parse(saved);
    // Sanitize old items that may be missing new fields
    return parsed.map((i) => ({
      ...i,
      sneaker: {
        ...i.sneaker,
        shippingCost: i.sneaker.shippingCost ?? 0,
        handlingTime: i.sneaker.handlingTime ?? "Ships in 1-3 days",
      },
    }));
  } catch { return []; }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);
  const [synced, setSynced] = useState(false);

  // ── Fetch cart from Supabase when user logs in ──────────────────────────
  const fetchCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("carts")
      .select("sneaker_id, sneaker_data, size, quantity")
      .eq("user_id", userId);

    if (error || !data) return;

    const remoteItems: CartItem[] = data.map((row) => ({
      sneaker: {
        ...(row.sneaker_data as CartItem["sneaker"]),
        shippingCost: (row.sneaker_data as any).shippingCost ?? 0,
        handlingTime: (row.sneaker_data as any).handlingTime ?? "Ships in 1-3 days",
      },
      size: row.size,
      quantity: row.quantity,
    }));

    // Merge: remote wins over local for logged-in users
    // Also push any local-only items (added before login) to Supabase
    const localItems = loadFromStorage();
    const merged = [...remoteItems];

    for (const local of localItems) {
      const exists = merged.find(
        (r) => r.sneaker.id === local.sneaker.id && r.size === local.size
      );
      if (!exists) {
        merged.push(local);
        // Push to Supabase
        await supabase.from("carts").upsert({
          user_id: userId,
          sneaker_id: local.sneaker.id,
          sneaker_data: local.sneaker,
          size: local.size,
          quantity: local.quantity,
        }, { onConflict: "user_id,sneaker_id,size" });
      }
    }

    setItems(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    setSynced(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchCart(user.id);
    } else {
      // Logged out — use localStorage only
      setSynced(true);
    }
  }, [user?.id, fetchCart]);

  // ── Persist to localStorage on every change ─────────────────────────────
  useEffect(() => {
    if (!synced) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, synced]);

  // ── Sync helpers ─────────────────────────────────────────────────────────
  const upsertRemote = async (sneaker: CartItem["sneaker"], size: number, quantity: number) => {
    if (!user?.id) return;
    await supabase.from("carts").upsert({
      user_id: user.id,
      sneaker_id: sneaker.id,
      sneaker_data: sneaker,
      size,
      quantity,
    }, { onConflict: "user_id,sneaker_id,size" });
  };

  const deleteRemote = async (sneakerId: string, size: number) => {
    if (!user?.id) return;
    await supabase.from("carts")
      .delete()
      .eq("user_id", user.id)
      .eq("sneaker_id", sneakerId)
      .eq("size", size);
  };

  const clearRemote = async () => {
    if (!user?.id) return;
    await supabase.from("carts").delete().eq("user_id", user.id);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const addItem = (sneaker: CartItem["sneaker"], size: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.sneaker.id === sneaker.id && i.size === size);
      const newQuantity = existing ? existing.quantity + 1 : 1;
      upsertRemote(sneaker, size, newQuantity);
      if (existing) {
        return prev.map((i) =>
          i.sneaker.id === sneaker.id && i.size === size
            ? { ...i, quantity: newQuantity }
            : i
        );
      }
      return [...prev, { sneaker, size, quantity: 1 }];
    });
  };

  const removeItem = (id: string, size: number) => {
    deleteRemote(id, size);
    setItems((prev) => prev.filter((i) => !(i.sneaker.id === id && i.size === size)));
  };

  const clearCart = () => {
    clearRemote();
    setItems([]);
  };

  const totalPrice = items.reduce((sum, i) => sum + i.sneaker.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalPrice, totalItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};