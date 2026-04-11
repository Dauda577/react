import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type CartItem = {
  listing: {
    id: string;
    name: string;
    brand: string;
    price: number; // This will be the final price (after discount)
    originalPrice?: number; // Optional: store original price for reference
    discountPercent?: number | null; // Optional: store discount percent
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
    } = item.listing;
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
    group.total += item.listing.price * item.quantity;
  }
  return Array.from(map.values());
}

type CartContextType = {
  items: CartItem[];
  loading: boolean;
  addItem: (listing: CartItem["listing"], size: string | number, originalPrice?: number, discountPercent?: number | null) => void;
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
    return parsed.map((i) => ({
      ...i,
      listing: {
        ...i.listing,
        shippingCost: i.listing?.shippingCost ?? 0,
        handlingTime: i.listing?.handlingTime ?? "Ships in 1-3 days",
      },
    }));
  } catch { return []; }
};

const sizeKey = (size: string | number): string => String(size);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  // Always start empty — we populate from the correct source in the effect below
  const [items, setItems] = useState<CartItem[]>([]);

  // readyToSave: only persist to localStorage AFTER we've loaded from the
  // authoritative source (DB for logged-in users, localStorage for guests).
  const [readyToSave, setReadyToSave] = useState(false);

  // ── Fetch cart from Supabase ──────────────────────────────────────────────
  const fetchCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("carts")
      .select("sneaker_id, sneaker_data, size, quantity")
      .eq("user_id", userId);

    if (error || !data) {
      // DB unavailable — fall back to localStorage so the cart isn't lost
      setItems(loadFromStorage(userId));
      setReadyToSave(true);
      return;
    }

    // Check which listing IDs are still active
    const listingIds = data.map((r) => r.sneaker_id).filter(Boolean);
    const { data: activeListings } = listingIds.length > 0
      ? await supabase.from("listings").select("id").in("id", listingIds).eq("status", "active")
      : { data: [] };
    const activeIds = new Set((activeListings ?? []).map((l: any) => l.id));

    // Remove stale rows
    const staleIds = listingIds.filter((id) => !activeIds.has(id));
    if (staleIds.length > 0) {
      await supabase.from("carts").delete().eq("user_id", userId).in("sneaker_id", staleIds);
    }

    const remoteItems: CartItem[] = data
      .filter((row) => activeIds.has(row.sneaker_id))
      .map((row) => ({
        listing: {
          ...(row.sneaker_data as CartItem["listing"]),
          shippingCost: (row.sneaker_data as any).shippingCost ?? 0,
          handlingTime: (row.sneaker_data as any).handlingTime ?? "Ships in 1-3 days",
        },
        // Numeric strings (EU sizes) become numbers; letter sizes stay strings
        size: isNaN(Number(row.size)) ? row.size : Number(row.size),
        quantity: row.quantity,
      }));

    // Merge any guest items added before login
    const guestItems = loadFromStorage(); // no userId = guest key
    const merged = [...remoteItems];

    for (const local of guestItems) {
      if (!activeIds.has(local.listing.id)) continue;
      const exists = merged.find(
        (r) => r.listing.id === local.listing.id && sizeKey(r.size) === sizeKey(local.size)
      );
      if (!exists) {
        merged.push(local);
        await supabase.from("carts").upsert({
          user_id: userId,
          sneaker_id: local.listing.id,
          sneaker_data: local.listing,
          size: sizeKey(local.size),
          quantity: local.quantity,
        }, { onConflict: "user_id,sneaker_id,size" }).catch(() => {});
      }
    }

    // Clear guest key now that we've merged
    localStorage.removeItem(storageKey());

    setItems(merged);
    localStorage.setItem(storageKey(userId), JSON.stringify(merged));
    setReadyToSave(true);
  }, []);

  // ── Auth change ───────────────────────────────────────────────────────────
  useEffect(() => {
    setReadyToSave(false);

    if (user?.id) {
      fetchCart(user.id);
    } else {
      // Guest — load from localStorage immediately
      setItems(loadFromStorage());
      setReadyToSave(true);
    }
  }, [user?.id, fetchCart]);

  // ── Persist to localStorage only when ready ───────────────────────────────
  useEffect(() => {
    if (!readyToSave) return;
    try {
      localStorage.setItem(storageKey(user?.id), JSON.stringify(items));
    } catch {}
  }, [items, readyToSave, user?.id]);

  // ── Remote sync helpers ───────────────────────────────────────────────────
  const upsertRemote = async (listing: CartItem["listing"], size: string | number, quantity: number) => {
    if (!user?.id) return;
    await supabase.from("carts").upsert({
      user_id: user.id,
      sneaker_id: listing.id,
      sneaker_data: listing,
      size: sizeKey(size),
      quantity,
    }, { onConflict: "user_id,sneaker_id,size" });
  };

  const deleteRemote = async (listingId: string, size: string | number) => {
    if (!user?.id) return;
    await supabase.from("carts")
      .delete()
      .eq("user_id", user.id)
      .eq("sneaker_id", listingId)
      .eq("size", sizeKey(size));
  };

  const clearRemote = async () => {
    if (!user?.id) return;
    await supabase.from("carts").delete().eq("user_id", user.id);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const addItem = (listing: CartItem["listing"], size: string | number) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.listing.id === listing.id && sizeKey(i.size) === sizeKey(size)
      );
      const newQuantity = existing ? existing.quantity + 1 : 1;

      upsertRemote(listing, size, newQuantity).catch((err) =>
        console.warn("Failed to sync cart to DB:", err)
      );

      if (existing) {
        return prev.map((i) =>
          i.listing.id === listing.id && sizeKey(i.size) === sizeKey(size)
            ? { ...i, quantity: newQuantity }
            : i
        );
      }
      return [...prev, { listing, size, quantity: 1 }];
    });
  };

  const removeItem = (id: string, size: string | number) => {
    deleteRemote(id, size);
    setItems((prev) =>
      prev.filter((i) => !(i.listing.id === id && sizeKey(i.size) === sizeKey(size)))
    );
  };

  const clearCart = () => {
    clearRemote();
    setItems([]);
    try { localStorage.removeItem(storageKey(user?.id)); } catch {}
  };

  const totalPrice = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      loading: !readyToSave, 
      addItem, removeItem, clearCart, totalPrice, totalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};