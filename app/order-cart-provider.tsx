"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ORDER_CART_STORAGE_KEY,
  addCartItem,
  clearCartItems,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  setCartItemQuantity,
  type CartItem,
  type CartItemInput,
} from "./order-cart";

export const HEADER_DRAWER_EVENT = "ishaq:header-drawer";
export type HeaderDrawerName = "menu" | "wishlist" | "search" | "cart";

export function announceHeaderDrawer(name: HeaderDrawerName) {
  window.dispatchEvent(new CustomEvent<HeaderDrawerName>(HEADER_DRAWER_EVENT, { detail: name }));
}

type OrderCartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  hydrated: boolean;
  drawerOpen: boolean;
  addItem: (item: CartItemInput) => void;
  removeItem: (key: string) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const OrderCartContext = createContext<OrderCartContextValue | null>(null);

export function OrderCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const storedItems = parseStoredCart(localStorage.getItem(ORDER_CART_STORAGE_KEY));
    const timer = window.setTimeout(() => {
      setItems(storedItems);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(ORDER_CART_STORAGE_KEY, serializeCart(items));
  }, [hydrated, items]);

  useEffect(() => {
    const closeForAnotherDrawer = (event: Event) => {
      if ((event as CustomEvent<HeaderDrawerName>).detail !== "cart") setDrawerOpen(false);
    };
    window.addEventListener(HEADER_DRAWER_EVENT, closeForAnotherDrawer);
    return () => window.removeEventListener(HEADER_DRAWER_EVENT, closeForAnotherDrawer);
  }, []);

  const addItem = useCallback((item: CartItemInput) => setItems((current) => addCartItem(current, item)), []);
  const removeItem = useCallback((key: string) => setItems((current) => removeCartItem(current, key)), []);
  const increment = useCallback((key: string) => setItems((current) => {
    const item = current.find((entry) => entry.key === key);
    return item ? setCartItemQuantity(current, key, item.quantity + 1) : current;
  }), []);
  const decrement = useCallback((key: string) => setItems((current) => {
    const item = current.find((entry) => entry.key === key);
    return item && item.quantity > 1 ? setCartItemQuantity(current, key, item.quantity - 1) : current;
  }), []);
  const clearCart = useCallback(() => setItems(clearCartItems()), []);
  const openCart = useCallback(() => {
    announceHeaderDrawer("cart");
    setDrawerOpen(true);
  }, []);
  const closeCart = useCallback(() => setDrawerOpen(false), []);
  const totalQuantity = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const value = useMemo(() => ({
    items, totalQuantity, hydrated, drawerOpen, addItem, removeItem, increment, decrement, clearCart, openCart, closeCart,
  }), [items, totalQuantity, hydrated, drawerOpen, addItem, removeItem, increment, decrement, clearCart, openCart, closeCart]);

  return <OrderCartContext.Provider value={value}>{children}</OrderCartContext.Provider>;
}

export function useOrderCart() {
  const value = useContext(OrderCartContext);
  if (!value) throw new Error("useOrderCart must be used within OrderCartProvider");
  return value;
}
