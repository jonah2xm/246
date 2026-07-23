"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CartItem } from "./types";

interface CartContextValue {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: Omit<CartItem, "id">) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  hydrate: (items: Omit<CartItem, "id">[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: Omit<CartItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setCart((prev) => [...prev, { ...item, id }]);
  }, []);

  const inc = useCallback((id: string) => {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  }, []);

  const dec = useCallback((id: string) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id && i.qty > 1 ? { ...i, qty: i.qty - 1 } : i))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  // Replaces the whole cart — used to resume an existing unpaid order's
  // current items rather than adding them one at a time.
  const hydrate = useCallback((items: Omit<CartItem, "id">[]) => {
    setCart(items.map((item, idx) => ({ ...item, id: `resume-${idx}-${Math.random().toString(36).slice(2)}` })));
  }, []);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.qty * i.unitPrice, 0), [cart]);

  const value = useMemo(
    () => ({ cart, cartCount, cartTotal, addToCart, inc, dec, remove, clear, hydrate }),
    [cart, cartCount, cartTotal, addToCart, inc, dec, remove, clear, hydrate]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
