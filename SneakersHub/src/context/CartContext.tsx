import React, { createContext, useContext, useState, ReactNode } from "react";
import { Sneaker } from "@/data/sneakers";

interface CartItem {
  sneaker: Sneaker;
  size: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (sneaker: Sneaker, size: number) => void;
  removeItem: (id: string, size: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (sneaker: Sneaker, size: number) => {
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

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.sneaker.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};