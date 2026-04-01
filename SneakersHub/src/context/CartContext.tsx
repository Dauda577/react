import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export type CartItem = {
  listing: {
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
  addItem: (listing: CartItem["listing"], size: string | number) => void;
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
        shippingCost: i.listing.shippingCost ?? 0,
        handlingTime: i.listing.handlingTime ?? "Ships in 1-3 days",
      },
    }));
  } catch { return []; }
};

const sizeKey = (size: string | number): string => String(size);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user, activeMode } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage(user?.id));
  const [synced, setSynced] = useState(false);
  const activeModeRef = useRef(activeMode);
  useEffect(() => { activeModeRef.current = activeMode; }, [activeMode]);

  const fetchCart = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("carts")
      .select("sneaker_id, sneaker_data, size, quantity")
      .eq("user_id", userId);

    if (error || !data) return;

    const listingIds = data.map((r) => r.sneaker_id).filter(Boolean);
    const { data: activeListings } = listingIds.length > 0
      ? await supabase.from("listings").select("id").in("id", listingIds).eq("status", "active")
      : { data: [] };
    const activeIds = new Set((activeListings ?? []).map((l: any) => l.id));

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
        size: isNaN(Number(row.size)) ? row.size : Number(row.size),
        quantity: row.quantity,
      }));

    const guestItems = loadFromStorage();
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
        }, { onConflict: "user_id,sneaker_id,size" });
      }
    }

    localStorage.removeItem(storageKey());
    setItems(merged);
    localStorage.setItem(storageKey(userId), JSON.stringify(merged));
    setSynced(true);
  }, []);

  useEffect(() => {
    if (user?.id && activeMode === "buyer") fetchCart(user.id);
    else { setItems([]); setSynced(true); }
  }, [user?.id, activeMode, fetchCart]);

  useEffect(() => {
    if (!synced) return;
    try { localStorage.setItem(storageKey(user?.id), JSON.stringify(items)); } catch {}
  }, [items, synced]);

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

  const addItem = (listing: CartItem["listing"], size: string | number) => {
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
        (i) => i.listing.id === listing.id && sizeKey(i.size) === sizeKey(size)
      );
      const newQuantity = existing ? existing.quantity + 1 : 1;

      const updatedItems = existing
        ? prev.map((i) =>
            i.listing.id === listing.id && sizeKey(i.size) === sizeKey(size)
              ? { ...i, quantity: newQuantity }
              : i
          )
        : [...prev, { listing, size, quantity: 1 }];

      try {
        localStorage.setItem(storageKey(user?.id), JSON.stringify(updatedItems));
      } catch {}

      upsertRemote(listing, size, newQuantity).catch((err) =>
        console.warn("Failed to sync cart:", err)
      );

      return updatedItems;
    });
  };

  const removeItem = (id: string, size: string | number) => {
    deleteRemote(id, size);
    setItems((prev) => {
      const updatedItems = prev.filter(
        (i) => !(i.listing.id === id && sizeKey(i.size) === sizeKey(size))
      );
      try { localStorage.setItem(storageKey(user?.id), JSON.stringify(updatedItems)); } catch {}
      return updatedItems;
    });
  };

  const clearCart = () => {
    clearRemote();
    setItems([]);
    try { localStorage.removeItem(storageKey(user?.id)); } catch {}
  };

  const totalPrice = items.reduce((sum, i) => sum + i.listing.price * i.quantity, 0);
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