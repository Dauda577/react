import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase, subscribeToTable } from "../lib/supabase";
import { useAuth } from "./AuthContext"; // You'll need to import this

export type CartItem = {
  sneaker: {
    id: string;
    name: string;
    brand: string;
    price: number;
    image: string;
    sellerId: string;
  };
  size: number;
  quantity: number;
};

// ── NEW: Database cart item type ─────────────────────────
type DBCartItem = {
  id: string;
  user_id: string;
  sneaker_id: string;
  sneaker_name: string;
  sneaker_brand: string;
  sneaker_price: number;
  sneaker_image: string;
  seller_id: string;
  size: number;
  quantity: number;
  created_at: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (sneaker: CartItem["sneaker"], size: number) => void;
  removeItem: (id: string, size: number) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
  // ── NEW: Sync status ───────────────────────────────────
  synced: boolean;
  isSyncing: boolean;
};

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [synced, setSynced] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAuth(); // Get current user

  // ── NEW: Load cart from database on mount ──────────────
  useEffect(() => {
    if (user) {
      loadCartFromDB();
    } else {
      // Load from localStorage for guest users
      loadCartFromLocal();
    }
  }, [user]);

  // ── NEW: Subscribe to real-time updates ─────────────────
  useEffect(() => {
    if (!user) return;

    const subscription = subscribeToTable(
      'cart_items',
      (payload) => {
        handleRealtimeUpdate(payload);
      },
      { column: 'user_id', value: user.id }
    );

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // ── NEW: Handle real-time database changes ──────────────
  const handleRealtimeUpdate = (payload: any) => {
    setSynced(false);
    
    switch (payload.eventType) {
      case 'INSERT':
        addItemFromDB(payload.new);
        break;
      case 'UPDATE':
        updateItemFromDB(payload.new);
        break;
      case 'DELETE':
        removeItemFromDB(payload.old);
        break;
    }
    
    setSynced(true);
  };

  // ── NEW: Convert DB item to CartItem ────────────────────
  const dbToCartItem = (dbItem: DBCartItem): CartItem => ({
    sneaker: {
      id: dbItem.sneaker_id,
      name: dbItem.sneaker_name,
      brand: dbItem.sneaker_brand,
      price: dbItem.sneaker_price,
      image: dbItem.sneaker_image,
      sellerId: dbItem.seller_id,
    },
    size: dbItem.size,
    quantity: dbItem.quantity,
  });

  // ── NEW: Load cart from database ────────────────────────
  const loadCartFromDB = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user?.id);

      if (!error && data) {
        const cartItems = data.map(dbToCartItem);
        setItems(cartItems);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // ── NEW: Load cart from localStorage ────────────────────
  const loadCartFromLocal = () => {
    const saved = localStorage.getItem('guest-cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load guest cart:', e);
      }
    }
  };

  // ── NEW: Save to localStorage when guest cart changes ───
  useEffect(() => {
    if (!user) {
      localStorage.setItem('guest-cart', JSON.stringify(items));
    }
  }, [items, user]);

  // ── NEW: Add item from database update ──────────────────
  const addItemFromDB = (dbItem: DBCartItem) => {
    setItems(prev => {
      const existing = prev.find(
        i => i.sneaker.id === dbItem.sneaker_id && i.size === dbItem.size
      );
      if (existing) {
        return prev.map(i =>
          i.sneaker.id === dbItem.sneaker_id && i.size === dbItem.size
            ? { ...i, quantity: dbItem.quantity }
            : i
        );
      }
      return [...prev, dbToCartItem(dbItem)];
    });
  };

  // ── NEW: Update item from database ──────────────────────
  const updateItemFromDB = (dbItem: DBCartItem) => {
    setItems(prev =>
      prev.map(i =>
        i.sneaker.id === dbItem.sneaker_id && i.size === dbItem.size
          ? dbToCartItem(dbItem)
          : i
      )
    );
  };

  // ── NEW: Remove item from database ──────────────────────
  const removeItemFromDB = (oldItem: DBCartItem) => {
    setItems(prev =>
      prev.filter(i => !(i.sneaker.id === oldItem.sneaker_id && i.size === oldItem.size))
    );
  };

  // ── MODIFIED: Add item with database sync ───────────────
  const addItem = async (sneaker: CartItem["sneaker"], size: number) => {
    if (user) {
      setSynced(false);
      try {
        const { error } = await supabase
          .from('cart_items')
          .upsert({
            user_id: user.id,
            sneaker_id: sneaker.id,
            sneaker_name: sneaker.name,
            sneaker_brand: sneaker.brand,
            sneaker_price: sneaker.price,
            sneaker_image: sneaker.image,
            seller_id: sneaker.sellerId,
            size: size,
            quantity: 1
          }, {
            onConflict: 'user_id,sneaker_id,size'
          });

        if (error) throw error;
      } catch (error) {
        console.error('Failed to sync cart:', error);
        // Fallback to local update
        setItems((prev) => {
          const existing = prev.find((i) => i.sneaker.id === sneaker.id && i.size === size);
          if (existing) {
            return prev.map((i) =>
              i.sneaker.id === sneaker.id && i.size === size
                ? { ...i, quantity: i.quantity + 1 }
                : i
            );
          }
          return [...prev, { sneaker, size, quantity: 1 }];
        });
      } finally {
        setSynced(true);
      }
    } else {
      // Guest user - local only
      setItems((prev) => {
        const existing = prev.find((i) => i.sneaker.id === sneaker.id && i.size === size);
        if (existing) {
          return prev.map((i) =>
            i.sneaker.id === sneaker.id && i.size === size
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, { sneaker, size, quantity: 1 }];
      });
    }
  };

  // ── MODIFIED: Remove item with database sync ────────────
  const removeItem = async (id: string, size: number) => {
    if (user) {
      setSynced(false);
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .match({
            user_id: user.id,
            sneaker_id: id,
            size: size
          });

        if (error) throw error;
      } catch (error) {
        console.error('Failed to sync cart:', error);
        // Fallback to local update
        setItems((prev) => prev.filter((i) => !(i.sneaker.id === id && i.size === size)));
      } finally {
        setSynced(true);
      }
    } else {
      // Guest user - local only
      setItems((prev) => prev.filter((i) => !(i.sneaker.id === id && i.size === size)));
    }
  };

  // ── MODIFIED: Clear cart with database sync ─────────────
  const clearCart = async () => {
    if (user) {
      setSynced(false);
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
      } catch (error) {
        console.error('Failed to sync cart:', error);
        setItems([]);
      } finally {
        setSynced(true);
      }
    } else {
      setItems([]);
    }
  };

  const totalPrice = items.reduce((sum, i) => sum + i.sneaker.price * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider 
      value={{ 
        items, 
        addItem, 
        removeItem, 
        clearCart, 
        totalPrice, 
        totalItems,
        synced,
        isSyncing
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};