import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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
  // string covers clothing sizes ("S","M","L") and no-size sentinel ("one-size")
  // number covers EU shoe sizes (39, 40, 41…)
  size: string | number;
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
    const {
      sellerId, sellerName, sellerVerified, sellerIsOfficial,
      sellerSubaccountCode, sellerCity, sellerRegion, shippingCost, handlingTime,
    } = item.sneaker;
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
  addItem: (sneaker: CartItem["sneaker"], size: string | number) => void;
  removeItem: (id: string, size: string | number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
};

const CartContext = createContext<CartContextType | null>(null);
const storageKey = (userId?: string) =>
  userId ? `sneakershub-cart-${userId}` : "sneakershub-cart-guest";

const loadFromStorage = (userId?: string): CartItem[] => {
  try {
    const saved = localStorage.getItem(storageKey(userId));
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

// Normalise size to a string for DB storage — keeps the conflict key consistent
const sizeKey = (size: string | number): string => String(size);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeMode } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());
  const [synced, setSynced] = useState(false);

  const activeModeRef = useRef(activeMode);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  // ── Fetch cart from Supabase when user logs in ──────────────────────────
  const fetchCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("carts")
      .select("sneaker_id, sneaker_data, size, quantity")
      .eq("user_id", userId);

    if (error || !data) return;

    // Check which listing IDs are still active
    const listingIds = data.map((r) => r.sneaker_id).filter(Boolean);
    const { data: activeListings } = listingIds.length > 0
      ? await supabase.from("listings").select("id").in("id", listingIds).eq("status", "active")
      : { data: [] };
    const activeIds = new Set((activeListings ?? []).map((l: any) => l.id));

    // Remove stale cart rows for deleted/sold listings
    const staleIds = listingIds.filter((id) => !activeIds.has(id));
    if (staleIds.length > 0) {
      await supabase.from("carts").delete().eq("user_id", userId).in("sneaker_id", staleIds);
    }

    const remoteItems: CartItem[] = data
      .filter((row) => activeIds.has(row.sneaker_id))
      .map((row) => ({
        sneaker: {
          ...(row.sneaker_data as CartItem["sneaker"]),
          shippingCost: (row.sneaker_data as any).shippingCost ?? 0,
          handlingTime: (row.sneaker_data as any).handlingTime ?? "Ships in 1-3 days",
        },
        // size stored as text in DB — keep as string, numeric strings become numbers for sneakers
        size: isNaN(Number(row.size)) ? row.size : Number(row.size),
        quantity: row.quantity,
      }));

    // Merge guest cart items (added before login) into remote
    const guestItems = loadFromStorage();
    const merged = [...remoteItems];

    for (const local of guestItems) {
      if (!activeIds.has(local.sneaker.id)) continue;
      const exists = merged.find(
        (r) => r.sneaker.id === local.sneaker.id && sizeKey(r.size) === sizeKey(local.size)
      );
      if (!exists) {
        merged.push(local);
        await supabase.from("carts").upsert({
          user_id: userId,
          sneaker_id: local.sneaker.id,
          sneaker_data: local.sneaker,
          size: sizeKey(local.size),
          quantity: local.quantity,
        }, { onConflict: "user_id,sneaker_id,size" });
      }
    }

    localStorage.removeItem(storageKey());
    setItems(merged);
    localStorage.setItem(storageKey(userId), JSON.stringify(merged));
    setSynced(true);
  }, []);

  useEffect(() => {
    if (user?.id && activeMode === "buyer") {
      fetchCart(user.id);
    } else {
      setItems([]);
      setSynced(true);
    }
  }, [user?.id, activeMode, fetchCart]);

  // ── Persist to localStorage on every change ─────────────────────────────
  useEffect(() => {
    if (!synced) return;
    try { localStorage.setItem(storageKey(user?.id), JSON.stringify(items)); } catch {}
  }, [items, synced]);

  // ── Sync helpers ─────────────────────────────────────────────────────────
  const upsertRemote = async (sneaker: CartItem["sneaker"], size: string | number, quantity: number) => {
    if (!user?.id) return;
    await supabase.from("carts").upsert({
      user_id: user.id,
      sneaker_id: sneaker.id,
      sneaker_data: sneaker,
      size: sizeKey(size),   // always store as string
      quantity,
    }, { onConflict: "user_id,sneaker_id,size" });
  };

  const deleteRemote = async (sneakerId: string, size: string | number) => {
    if (!user?.id) return;
    await supabase.from("carts")
      .delete()
      .eq("user_id", user.id)
      .eq("sneaker_id", sneakerId)
      .eq("size", sizeKey(size));
  };

  const clearRemote = async () => {
    if (!user?.id) return;
    await supabase.from("carts").delete().eq("user_id", user.id);
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const addItem = (sneaker: CartItem["sneaker"], size: string | number) => {
    if (activeModeRef.current === "seller") {
      toast.error("Please switch to Buyer mode to add items to cart", {
        description: "Use the Buy/Sell toggle in the navbar",
        duration: 4000,
        action: { label: "Got it", onClick: () => {} },
      });
      return;
    }

    setItems((prev) => {
      const existing = prev.find(
        (i) => i.sneaker.id === sneaker.id && sizeKey(i.size) === sizeKey(size)
      );
      const newQuantity = existing ? existing.quantity + 1 : 1;

      upsertRemote(sneaker, size, newQuantity).catch((err) =>
        console.warn("Failed to sync cart:", err)
      );

      if (existing) {
        return prev.map((i) =>
          i.sneaker.id === sneaker.id && sizeKey(i.size) === sizeKey(size)
            ? { ...i, quantity: newQuantity }
            : i
        );
      }
      return [...prev, { sneaker, size, quantity: 1 }];
    });
  };

  const removeItem = (id: string, size: string | number) => {
    deleteRemote(id, size);
    setItems((prev) =>
      prev.filter((i) => !(i.sneaker.id === id && sizeKey(i.size) === sizeKey(size)))
    );
  };

  const clearCart = () => {
    clearRemote();
    setItems([]);
    try { localStorage.removeItem(storageKey(user?.id)); } catch {}
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