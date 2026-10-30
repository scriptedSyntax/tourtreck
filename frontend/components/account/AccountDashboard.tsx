"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductList from "@/components/home/ProductList";
import { secureJsonHeaders, useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/format";
import { isValidPhone, normalizePhone, normalizeText } from "@/lib/input-security";
import type { Order, PaginatedResponse } from "@/types/api";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function AccountDashboard({ currency, contactPhone }: { currency: string; contactPhone: string }) {
  const router = useRouter();
  const { user, loading: authLoading, wishlistProducts, reload } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersUnavailable, setOrdersUnavailable] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [cancelingOrderId, setCancelingOrderId] = useState<number | null>(null);
  const [orderActionError, setOrderActionError] = useState<Record<number, string>>({});
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  useEffect(() => {
    async function load() {
      if (authLoading) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const response = await fetch("/api/customer/orders", { cache: "no-store" });
        if (!response.ok) {
          setOrdersUnavailable(true);
          return;
        }
        const data: PaginatedResponse<Order> = await response.json();
        setOrders(data.results);
      } catch {
        setOrdersUnavailable(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router, user, authLoading]);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = normalizeText(fullName, 255);
    const cleanPhone = normalizePhone(phone);
    setProfileError("");
    setProfileSaved(false);

    if (cleanName.length < 2 || !isValidPhone(cleanPhone)) {
      setProfileError("Please enter a valid name and phone number.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: secureJsonHeaders(),
        body: JSON.stringify({ full_name: cleanName, phone: cleanPhone }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setProfileError(data?.message || "Your profile could not be updated right now.");
        return;
      }
      await reload();
      setProfileSaved(true);
    } catch {
      setProfileError("Your profile could not be updated right now.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(orderId: number) {
    if (cancelingOrderId !== null) return;
    setCancelingOrderId(orderId);
    setOrderActionError((current) => ({ ...current, [orderId]: "" }));
    try {
      const response = await fetch(`/api/customer/orders/${orderId}/cancel`, {
        method: "POST",
        headers: secureJsonHeaders(),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setOrderActionError((current) => ({
          ...current,
          [orderId]: response.status === 409
            ? "Please contact the shop to request cancellation."
            : typeof data?.message === "string" ? data.message : "Please contact the shop to request cancellation.",
        }));
        return;
      }
      setOrders((current) => current.map((order) => order.id === orderId ? data as Order : order));
    } catch {
      setOrderActionError((current) => ({ ...current, [orderId]: "Please contact the shop to request cancellation." }));
    } finally {
      setCancelingOrderId(null);
    }
  }

  if (loading) return <p className="py-16 text-center">Loading your account...</p>;
  if (!user) return null;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border p-6">
        <h1 className="mb-5 text-2xl font-bold">Hello, {user.full_name}</h1>
        <form onSubmit={updateProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={255} autoComplete="name" />
            </div>
            <div>
              <label className="text-sm font-medium">Phone number</label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={7} maxLength={30} autoComplete="tel" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          {profileError && <p className="text-sm text-destructive">{profileError}</p>}
          {profileSaved && <p className="text-sm text-green-700">Your profile has been updated.</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</Button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Your wishlist</h2>
          <span className="text-sm text-muted-foreground">{wishlistProducts.length} saved</span>
        </div>
        {wishlistProducts.length ? (
          <ProductList products={wishlistProducts} currency={currency} />
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">Products you save will appear here.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        )}
      </section>

      <section id="flexible-purchase" className="scroll-mt-24 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-background p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Flexible Purchase</h2>
              <Badge variant="secondary">Coming soon</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Lipa pole pole with flexible payments that make it easier to get the bicycle you want.</p>
          </div>
          <Button type="button" disabled>Coming soon</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Recent orders</h2>
        {ordersUnavailable ? (
          <p className="text-muted-foreground">We couldn&apos;t load your orders right now. Please try again shortly.</p>
        ) : orders.length ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">Order #{order.reference}</p>
                    <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-KE")} · {order.status.replace("_", " ")}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(order.total, currency)}</p>
                </div>
                <ul className="mt-3 space-y-2 border-t pt-3 text-sm">
                  {order.items.map((item) => {
                    const content = (
                      <>
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                          {item.product_image ? (
                            <Image src={item.product_image} alt={item.product_name} width={56} height={56} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">No image</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium group-hover:text-primary">{item.product_name}</p>
                          <p className="text-muted-foreground">Quantity: {item.quantity}</p>
                          {item.selected_colour && <p className="text-muted-foreground">Colour: {item.selected_colour}</p>}
                        </div>
                        <span className="whitespace-nowrap text-muted-foreground">{formatCurrency(item.total_price, currency)}</span>
                      </>
                    );
                    return (
                      <li key={item.id}>
                        {item.product_slug ? (
                          <Link href={`/product/${item.product_slug}`} className="group flex items-center gap-3 rounded-md p-1 hover:bg-muted/60">{content}</Link>
                        ) : (
                          <div className="flex items-center gap-3 rounded-md p-1">{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {order.status === "PENDING" && now !== null && now - new Date(order.created_at).getTime() <= 48 * 60 * 60 * 1000 ? (
                    <Button type="button" variant="outline" size="sm" disabled={cancelingOrderId !== null} onClick={() => void cancelOrder(order.id)}>
                      {cancelingOrderId === order.id ? "Cancelling..." : "Cancel order"}
                    </Button>
                  ) : !["DELIVERED", "CANCELLED"].includes(order.status) && contactPhone ? (
                    <Button asChild variant="outline" size="sm"><a href={`tel:${contactPhone}`}>Call shop about cancellation</a></Button>
                  ) : null}
                  {order.status === "DELIVERED" && order.delivered_at && now !== null && now - new Date(order.delivered_at).getTime() <= 48 * 60 * 60 * 1000 && !order.exchange_requested && <Button asChild variant="outline" size="sm"><Link href={`/account/orders/${order.id}/exchange`}>Request exchange</Link></Button>}
                  {order.exchange_requested && <Badge variant="secondary">Exchange requested</Badge>}
                  {order.exchange_request_notes && <p className="w-full text-sm text-muted-foreground">Exchange request: {order.exchange_request_notes}</p>}
                  {orderActionError[order.id] && <p className="text-sm text-destructive" role="alert">{orderActionError[order.id]}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-muted-foreground">You have no orders yet.</p>}
      </section>
    </div>
  );
}
