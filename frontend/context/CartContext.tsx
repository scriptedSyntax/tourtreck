"use client";

import { secureJsonHeaders, useAuth } from "@/context/AuthContext";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedColour?: string;
}

type BackendCart = {
  items?: Array<{
    product: number;
    quantity: number;
    selected_colour?: string;
    product_detail?: { name?: string; price?: string | number; images?: Array<{ image?: string; is_main?: boolean }> };
  }>;
};

interface CartContextProps {
  cart: CartItem[];
  loading: boolean;
  error: string;
  addToCart: (item: CartItem) => Promise<boolean>;
  removeFromCart: (id: number) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  updateQuantity: (id: number, quantity: number) => Promise<boolean>;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

function safeGuestCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<number, CartItem>();
    for (const raw of parsed.slice(0, 50)) {
      const id = Number(raw?.id);
      const price = Number(raw?.price);
      const quantity = Number(raw?.quantity);
      if (!Number.isInteger(id) || id < 1 || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity)) continue;
      unique.set(id, {
        id,
        name: typeof raw.name === "string" ? raw.name.slice(0, 255) : "Product",
        price,
        image: typeof raw.image === "string" ? raw.image.slice(0, 2000) : "",
        quantity: Math.min(100, Math.max(1, quantity)),
        selectedColour: typeof raw.selectedColour === "string" ? raw.selectedColour.slice(0, 60) : "",
      });
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

function mapBackendCart(data: BackendCart): CartItem[] {
  if (!Array.isArray(data.items)) return [];
  return data.items.slice(0, 50).flatMap((item) => {
    const product = item.product_detail;
    if (!product || !Number.isInteger(item.product) || !Number.isInteger(item.quantity)) return [];
    const mainImage = product.images?.find((image) => image.is_main) ?? product.images?.[0];
    return [{
      id: item.product,
      name: product.name ?? "Product",
      price: Number(product.price ?? 0),
      image: mainImage?.image ?? "",
      quantity: Math.min(100, Math.max(1, item.quantity)),
      selectedColour: item.selected_colour ?? "",
    }];
  });
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mergedForUser = useRef<number | null>(null);
  const isCustomer = user?.role === "CUSTOMER";

  async function authenticatedRequest(method: string, body?: Record<string, unknown>) {
    const run = () => fetch("/api/cart", {
      method,
      headers: body ? secureJsonHeaders() : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    let response = await run();
    if (response.status === 401) {
      const refreshed = await fetch("/api/auth/me", { cache: "no-store" });
      if (refreshed.ok) response = await run();
    }
    return response;
  }

  async function applyResponse(response: Response, fallback: string) {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setError(typeof data?.message === "string" ? data.message : fallback);
      return false;
    }
    setCart(mapBackendCart(data));
    setError("");
    return true;
  }

  useEffect(() => {
    if (authLoading) return;
    async function loadCart() {
      setLoading(true);
      if (!isCustomer) {
        if (user) {
          setCart([]);
        } else {
          setCart(safeGuestCart(localStorage.getItem("cart")));
        }
        setLoading(false);
        return;
      }

      const guestItems = safeGuestCart(localStorage.getItem("cart"));
      const shouldMerge = mergedForUser.current !== user.id && guestItems.length > 0;
      try {
        const response = shouldMerge
          ? await authenticatedRequest("POST", { merge: true, items: guestItems.map((item) => ({ product: item.id, quantity: item.quantity, selected_colour: item.selectedColour ?? "" })) })
          : await authenticatedRequest("GET");
        const applied = await applyResponse(response, "Your cart could not be loaded right now.");
        if (applied && shouldMerge) {
          mergedForUser.current = user.id;
          localStorage.removeItem("cart");
        }
      } catch {
        setError("Your cart could not be loaded right now.");
      } finally {
        setLoading(false);
      }
    }
    void loadCart();
  }, [authLoading, isCustomer, user]);

  useEffect(() => {
    if (!authLoading && !loading && !user) localStorage.setItem("cart", JSON.stringify(cart.slice(0, 50)));
  }, [cart, authLoading, loading, user]);

  async function addToCart(item: CartItem) {
    setError("");
    const requestedQuantity = Math.min(100, Math.max(1, Math.trunc(item.quantity || 1)));
    if (!isCustomer) {
      if (user) {
        setError("Customer access is required to use the cart.");
        return false;
      }
      const existing = cart.find((cartItem) => cartItem.id === item.id);
      if (!existing && cart.length >= 50) {
        setError("Your cart can contain up to 50 different products.");
        return false;
      }
      setCart((current) => existing
        ? current.map((cartItem) => cartItem.id === item.id ? { ...cartItem, quantity: Math.min(100, cartItem.quantity + requestedQuantity) } : cartItem)
        : [...current, { ...item, quantity: requestedQuantity }]);
      return true;
    }
    setLoading(true);
    try {
      return await applyResponse(
        await authenticatedRequest("POST", { items: [{ product: item.id, quantity: requestedQuantity, selected_colour: item.selectedColour ?? "" }] }),
        "This product could not be added to your cart.",
      );
    } catch {
      setError("This product could not be added to your cart.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function removeFromCart(id: number) {
    setError("");
    if (!isCustomer) {
      setCart((current) => current.filter((item) => item.id !== id));
      return true;
    }
    try {
      return await applyResponse(await authenticatedRequest("DELETE", { product: id }), "This item could not be removed.");
    } catch {
      setError("This item could not be removed.");
      return false;
    }
  }

  async function clearCart() {
    setError("");
    if (!isCustomer) {
      setCart([]);
      localStorage.removeItem("cart");
      return true;
    }
    try {
      return await applyResponse(await authenticatedRequest("DELETE", {}), "Your cart could not be cleared.");
    } catch {
      setError("Your cart could not be cleared.");
      return false;
    }
  }

  async function updateQuantity(id: number, quantity: number) {
    const safeQuantity = Math.min(100, Math.max(1, Math.trunc(quantity)));
    setError("");
    if (!isCustomer) {
      setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: safeQuantity } : item));
      return true;
    }
    try {
      return await applyResponse(await authenticatedRequest("PATCH", { product: id, quantity: safeQuantity }), "That quantity is not currently available.");
    } catch {
      setError("That quantity could not be updated.");
      return false;
    }
  }

  return <CartContext.Provider value={{ cart, loading, error, addToCart, removeFromCart, clearCart, updateQuantity }}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
