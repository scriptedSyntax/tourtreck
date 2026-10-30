"use client";

import type { Product, UserProfile } from "@/types/api";
import { createContext, useContext, useEffect, useState } from "react";

type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  wishlist: number[];
  wishlistProducts: Product[];
  reload: () => Promise<void>;
  establishSession: (user: UserProfile) => void;
  toggleWishlist: (productId: number) => Promise<{ ok: boolean; message: string }>;
};
const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  wishlist: [],
  wishlistProducts: [],
  reload: async () => undefined,
  establishSession: () => undefined,
  toggleWishlist: async () => ({ ok: false, message: "Please sign in to use your wishlist." }),
});

export function csrfToken() {
  return decodeURIComponent(document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? "");
}

export function secureJsonHeaders() {
  return { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  function establishSession(authenticatedUser: UserProfile) {
    setUser(authenticatedUser);
    setWishlist([]);
    setWishlistProducts([]);
    setLoading(false);
  }
  async function reload() {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setUser(null);
        setWishlist([]);
        setWishlistProducts([]);
        return;
      }
      const currentUser: UserProfile = await response.json();
      setUser(currentUser);
      if (currentUser.role !== "CUSTOMER") {
        setWishlist([]);
        setWishlistProducts([]);
        return;
      }
      const wishlistResponse = await fetch("/api/customer/wishlist", { cache: "no-store" });
      const wishlistData = wishlistResponse.ok ? await wishlistResponse.json() : { product_ids: [], products: [] };
      setWishlist(Array.isArray(wishlistData.product_ids) ? wishlistData.product_ids : []);
      setWishlistProducts(Array.isArray(wishlistData.products) ? wishlistData.products : []);
    } catch {
      setUser(null);
      setWishlist([]);
      setWishlistProducts([]);
    }
    finally { setLoading(false); }
  }
  async function toggleWishlist(productId: number) {
    if (user?.role !== "CUSTOMER" || !Number.isInteger(productId) || productId < 1) {
      return { ok: false, message: "Please sign in with a customer account." };
    }
    const isSaved = wishlist.includes(productId);
    try {
      const response = await fetch("/api/customer/wishlist", {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify({ product_id: productId, saved: !isSaved }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) await reload();
        return {
          ok: false,
          message: response.status === 401 ? "Please sign in again to update your wishlist." : "Your wishlist could not be updated right now.",
        };
      }
      setWishlist(Array.isArray(data.product_ids) ? data.product_ids : []);
      setWishlistProducts(Array.isArray(data.products) ? data.products : []);
      return { ok: true, message: isSaved ? "Removed from your wishlist." : "Saved to your wishlist." };
    } catch {
      return { ok: false, message: "Your wishlist could not be updated right now." };
    }
  }
  useEffect(() => { void reload(); }, []);
  return <AuthContext.Provider value={{ user, loading, wishlist, wishlistProducts, reload, establishSession, toggleWishlist }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
