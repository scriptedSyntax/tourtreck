"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DeliveryLocationPicker, { type DeliveryLocationSelection } from "@/components/checkout/DeliveryLocationPicker";
import { secureJsonHeaders, useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/format";
import { deliveryFeeForLocation } from "@/lib/delivery";
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone, normalizeText } from "@/lib/input-security";
import { cn } from "@/lib/utils";
import type { PaymentMethod, ShopProfile } from "@/types/api";
import { Banknote, Building2, CheckCircle2, CreditCard, LoaderCircle, ShieldCheck, Smartphone, Store, Truck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function CheckoutForm({ profile, paymentMethods }: { profile: ShopProfile; paymentMethods: PaymentMethod[] }) {
  const { user, loading: authLoading } = useAuth();
  const { cart, clearCart, loading: cartLoading, error: cartError } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState<number | null>(paymentMethods.length === 1 ? paymentMethods[0].id : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderReference, setOrderReference] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationSelection | null>(null);
  const [notes, setNotes] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === "DELIVERY" && deliveryLocation
    ? deliveryFeeForLocation(deliveryLocation.latitude, deliveryLocation.longitude)
    : 0;
  const selectedPayment = paymentMethods.find((method) => method.id === paymentMethod);

  useEffect(() => {
    if (user) {
      setCustomerName(user.full_name ?? "");
      setCustomerPhone(user.phone ?? "");
      setCustomerEmail(user.email ?? "");
    }
  }, [user]);

  function chooseDelivery(method: "DELIVERY" | "PICKUP") {
    setDeliveryMethod(method);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const cleanName = normalizeText(customerName, 255);
    const cleanPhone = normalizePhone(customerPhone);
    const cleanEmail = normalizeEmail(customerEmail);
    const cleanLocation = normalizeText(deliveryLocation?.address, 500);
    const cleanNotes = normalizeText(notes, 2000);
    const cleanPaymentReference = normalizeText(paymentReference, 100).toUpperCase();
    const paymentIdentity = selectedPayment ? `${selectedPayment.code} ${selectedPayment.name}`.toLowerCase() : "";
    const needsPaymentReference = paymentIdentity.includes("mpesa") || paymentIdentity.includes("m-pesa") || paymentIdentity.includes("bank");

    setError("");
    if (cleanName.length < 2 || !isValidPhone(cleanPhone) || !isValidEmail(cleanEmail)) {
      setError(user ? "Your saved account details need attention. Update your profile before placing the order." : "Enter a valid name, phone number and email address.");
      return;
    }
    if (deliveryMethod === "DELIVERY" && (!cleanLocation || !deliveryLocation)) {
      setError("Select and confirm your delivery location on the map.");
      return;
    }
    if (!paymentMethod || !selectedPayment) {
      setError("Choose how you would like to pay.");
      return;
    }
    if (needsPaymentReference && !/^[A-Z0-9-]{4,100}$/.test(cleanPaymentReference)) {
      setError("Enter a valid payment confirmation reference using letters, numbers, or hyphens.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify({
          customer_name: cleanName,
          customer_phone: cleanPhone,
          customer_email: cleanEmail,
          delivery_method: deliveryMethod,
          delivery_location: deliveryMethod === "DELIVERY" ? cleanLocation : "",
          delivery_latitude: deliveryMethod === "DELIVERY" ? deliveryLocation?.latitude : null,
          delivery_longitude: deliveryMethod === "DELIVERY" ? deliveryLocation?.longitude : null,
          delivery_place_id: deliveryMethod === "DELIVERY" ? deliveryLocation?.placeId : "",
          notes: cleanNotes,
          payment_method: paymentMethod,
          payment_reference: needsPaymentReference ? cleanPaymentReference : "",
          items: cart.map((item) => ({ product: item.id, quantity: item.quantity, selected_colour: item.selectedColour ?? "" })),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof data?.message === "string" ? data.message : "We could not place your order. Check the details and try again.");
        return;
      }
      if (typeof data?.reference !== "string" || !data.reference) {
        setError("Your order could not be confirmed right now. Please try again.");
        return;
      }
      clearCart();
      setOrderReference(data.reference);
    } catch {
      setError("We could not place your order right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || cartLoading) {
    return <div className="flex min-h-[45vh] items-center justify-center gap-2 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /> Preparing checkout...</div>;
  }
  if (orderReference) {
    return <div className="py-16 text-center"><CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-primary" /><h1 className="mb-3 text-3xl font-bold">Order received</h1><p className="text-muted-foreground">Your order number is #{orderReference}. The shop will process it shortly.</p>{!user && <p className="mt-2 mb-6 text-sm text-muted-foreground">Check your email to secure your account and follow your order.</p>}<Button asChild className={user ? "mt-6" : ""}><Link href="/products">Continue shopping</Link></Button></div>;
  }
  if (cart.length === 0) {
    return <div className="py-16 text-center"><h1 className="mb-3 text-2xl font-bold">Your cart is empty</h1><Button asChild><Link href="/products">Browse products</Link></Button></div>;
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 rounded-lg border p-6 lg:col-span-2">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review your details and choose delivery and payment.</p>
        </div>

        {user ? (
          <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Account details</h2>
              <Link href="/account" className="text-sm font-medium text-primary hover:underline">Update profile</Link>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Name</dt><dd className="mt-1 font-medium break-words">{customerName}</dd></div>
              <div><dt className="text-muted-foreground">Phone</dt><dd className="mt-1 font-medium break-words">{customerPhone}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 font-medium break-words">{customerEmail}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="font-semibold">Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="text-sm font-medium" htmlFor="checkout-name">Full name</label><Input id="checkout-name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={255} autoComplete="name" /></div>
              <div><label className="text-sm font-medium" htmlFor="checkout-phone">Phone</label><Input id="checkout-phone" required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} maxLength={30} autoComplete="tel" /></div>
            </div>
            <div><label className="text-sm font-medium" htmlFor="checkout-email">Email</label><Input id="checkout-email" type="email" required value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} maxLength={254} autoComplete="email" /></div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-semibold">Delivery method</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" aria-pressed={deliveryMethod === "DELIVERY"} onClick={() => chooseDelivery("DELIVERY")} className={cn("h-auto justify-start p-4", deliveryMethod === "DELIVERY" && "border-primary bg-primary/10 text-primary ring-1 ring-primary")}>
              <Truck className="h-5 w-5" /><span className="text-left"><strong className="block">Delivery</strong><span className="text-xs font-normal">Send it to your location</span></span>
            </Button>
            {profile.pickup_enabled && (
              <Button type="button" variant="outline" aria-pressed={deliveryMethod === "PICKUP"} onClick={() => chooseDelivery("PICKUP")} className={cn("h-auto justify-start p-4", deliveryMethod === "PICKUP" && "border-primary bg-primary/10 text-primary ring-1 ring-primary")}>
                <Store className="h-5 w-5" /><span className="text-left"><strong className="block">Pickup</strong><span className="text-xs font-normal">Collect from the shop</span></span>
              </Button>
            )}
          </div>
        </section>

        {deliveryMethod === "DELIVERY" && (
          <section className="space-y-3">
            <h2 className="font-semibold">Delivery location</h2>
            <DeliveryLocationPicker value={deliveryLocation} onChange={(location) => { setDeliveryLocation(location); setError(""); }} />
          </section>
        )}

        <section>
          <h2 className="mb-3 font-semibold">Payment method</h2>
          {paymentMethods.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentMethods.map((method) => {
                const identity = `${method.code} ${method.name}`.toLowerCase();
                const PaymentIcon = identity.includes("mpesa") || identity.includes("m-pesa")
                  ? Smartphone
                  : identity.includes("bank")
                    ? Building2
                    : identity.includes("card")
                      ? CreditCard
                      : Banknote;
                const selected = paymentMethod === method.id;
                return (
                  <Button key={method.id} type="button" variant="outline" aria-pressed={selected} onClick={() => { setPaymentMethod(method.id); setPaymentReference(""); setError(""); }} className={cn("h-auto justify-start p-4", selected && "border-primary bg-primary/10 text-primary ring-1 ring-primary")}>
                    <PaymentIcon className="h-5 w-5" />
                    <span className="text-left"><strong className="block">{method.name}</strong><span className="text-xs font-normal">{selected ? "Selected" : "Choose this method"}</span></span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Payment options are temporarily unavailable.</p>
          )}
          {selectedPayment?.instructions && <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{selectedPayment.instructions}</p>}
          {selectedPayment && `${selectedPayment.code} ${selectedPayment.name}`.toLowerCase().includes("cash") && <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">Cash payment stays pending until collected after delivery. The delivery fee is payable {profile.delivery_payment_timing === "BEFORE_DISPATCH" ? "before dispatch" : "on delivery"}.</p>}
          {selectedPayment && (() => {
            const identity = `${selectedPayment.code} ${selectedPayment.name}`.toLowerCase();
            const isMpesa = identity.includes("mpesa") || identity.includes("m-pesa");
            const isBank = identity.includes("bank");
            if (!isMpesa && !isBank) return null;
            return (
              <div className="mt-3">
                <label className="text-sm font-medium" htmlFor="payment-reference">{isMpesa ? "M-Pesa confirmation code" : "Bank transfer reference"}</label>
                <Input
                  id="payment-reference"
                  value={paymentReference}
                  onChange={(event) => { setPaymentReference(event.target.value.toUpperCase()); setError(""); }}
                  minLength={4}
                  maxLength={100}
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={isMpesa ? "Example: QAB12CD34E" : "Enter your transfer reference"}
                  className="mt-1 uppercase"
                />
              </div>
            );
          })()}
        </section>

        <div><label className="text-sm font-medium" htmlFor="order-notes">Order notes <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="order-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} /></div>
      </div>

      <aside className="h-fit space-y-4 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Order summary</h2>
        {cart.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span>{item.name} × {item.quantity}</span><span className="whitespace-nowrap">{formatCurrency(item.price * item.quantity, profile.currency)}</span></div>)}
        <div className="flex justify-between border-t pt-3"><span>Subtotal</span><span>{formatCurrency(subtotal, profile.currency)}</span></div>
        {deliveryMethod === "DELIVERY" && (
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="font-medium">{deliveryLocation ? `Delivery: ${formatCurrency(deliveryFee, profile.currency)}` : "Delivery fee will be calculated from your map location."}</p>
          </div>
        )}
        <div className="flex justify-between border-t pt-3 font-bold"><span>Total</span><span>{formatCurrency(subtotal + deliveryFee, profile.currency)}</span></div>
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>Secure Payment.</span></div>
        {(error || cartError) && <p className="break-words rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error || cartError}</p>}
        <Button type="submit" className={cn("w-full", (error || cartError) && "bg-destructive text-destructive-foreground hover:bg-destructive/90")} disabled={loading || paymentMethods.length === 0}>
          {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Placing order...</> : (error || cartError) ? "Check details and try again" : "Place order"}
        </Button>
      </aside>
    </form>
  );
}
