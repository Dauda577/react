import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(loadFromStorage);

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (sneaker: CartItem["sneaker"], size: number) => {
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
  };

  const removeItem = (id: string, size: number) => {
    setItems((prev) => prev.filter((i) => !(i.sneaker.id === id && i.size === size)));
  };

  const clearCart = () => setItems([]);

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