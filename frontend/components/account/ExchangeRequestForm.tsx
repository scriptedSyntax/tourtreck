"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { secureJsonHeaders } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ExchangeRequestForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!notes.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/customer/orders/${orderId}/exchange`, {
        method: "POST", headers: secureJsonHeaders(), body: JSON.stringify({ notes: notes.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.message || "The exchange request could not be sent. Please check the order and try again.");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("The exchange request could not be sent. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <nav className="mb-8 flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link href="/account">Back to account</Link></Button>
        <Button asChild variant="ghost"><Link href="/products">Continue shopping</Link></Button>
      </nav>
      <form onSubmit={submit} className="space-y-5 rounded-lg border p-6">
        <div>
          <p className="text-sm font-medium text-primary">Order #{orderId}</p>
          <h1 className="mt-1 text-2xl font-semibold">Request a product exchange</h1>
          <p className="mt-2 text-sm text-muted-foreground">Exchange requests must be made within 48 hours of delivery. The replacement product must be the same value; the shop will review your request.</p>
        </div>
        <label htmlFor="exchange-notes" className="block text-sm font-medium">Which product would you like instead?</label>
        <Textarea id="exchange-notes" value={notes} onChange={(event) => setNotes(event.target.value.slice(0, 2000))} maxLength={2000} required rows={5} placeholder="Product name, colour, or other details" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || !notes.trim()}>{saving ? "Sending request..." : "Send exchange request"}</Button>
          <Button asChild type="button" variant="outline"><Link href="/account">Cancel</Link></Button>
        </div>
      </form>
    </main>
  );
}
