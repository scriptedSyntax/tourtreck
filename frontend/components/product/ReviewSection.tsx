"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProductReview } from "@/types/api";
import { Star } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { secureJsonHeaders, useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/types/api";

export default function ReviewSection({ product, initialReviews }: { product: Product; initialReviews: ProductReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [eligibility, setEligibility] = useState<{ can_review: boolean; already_reviewed: boolean; delivered_purchase: boolean } | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const mainImage = product.images.find((image) => image.is_main) ?? product.images[0];

  useEffect(() => {
    if (user?.role !== "CUSTOMER") {
      setEligibility(null);
      return;
    }
    let active = true;
    setEligibilityLoading(true);
    fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setEligibility(data); })
      .catch(() => { if (active) setEligibility(null); })
      .finally(() => { if (active) setEligibilityLoading(false); });
    return () => { active = false; };
  }, [product.slug, user]);

  async function addProductToCart() {
    if (product.stock < 1) return;
    const added = await addToCart({ id: product.id, name: product.name, price: Number(product.price), image: mainImage?.image ?? "", quantity: 1, selectedColour: product.available_colours.split(",")[0]?.trim() ?? "" });
    setCartMessage(added ? "Added to your cart." : "This product could not be added right now.");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch(`/api/products/${encodeURIComponent(product.slug)}/reviews`, {
        method: "POST",
        headers: secureJsonHeaders(),
        body: JSON.stringify({ ...values, rating }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.code === "purchase_required") {
          setEligibility({ can_review: false, already_reviewed: false, delivered_purchase: false });
          return;
        }
        setError(data?.message || "Review could not be saved. Only delivered purchases can be reviewed.");
        return;
      }
      setReviews((current) => [data, ...current]);
      event.currentTarget.reset();
      setRating(5);
      setEligibility({ can_review: false, already_reviewed: true, delivered_purchase: true });
    } catch {
      setError("Review could not be saved right now. Please try again shortly.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-t pt-6 space-y-5">
      <h2 className="text-xl font-semibold">Customer reviews</h2>
      {!authLoading && !user ? (
        <p className="text-sm text-muted-foreground"><Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link> to review this product.</p>
      ) : user && user.role !== "CUSTOMER" ? (
        <p className="text-sm text-muted-foreground">A customer account is required to review products.</p>
      ) : eligibilityLoading ? (
        <p className="text-sm text-muted-foreground">Checking review eligibility...</p>
      ) : user && eligibility?.already_reviewed ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">You have already reviewed this product.</p>
      ) : user && eligibility && !eligibility.delivered_purchase ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Only customers with a delivered purchase can rate this product.</p>
          {product.stock > 0 && <Button type="button" onClick={addProductToCart}>Add to cart</Button>}
          {cartMessage && <p className="text-sm text-muted-foreground" role="status">{cartMessage}</p>}
        </div>
      ) : user && eligibility?.can_review ? (
        <form onSubmit={submit} className="space-y-3 rounded-lg border p-4">
          <div><label className="text-sm font-medium">Your rating</label><div className="flex mt-1">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} onClick={() => setRating(star)} aria-label={`${star} stars`}><Star className={`h-6 w-6 ${star <= rating ? "fill-amber-400 text-amber-500" : "fill-gray-100 text-gray-400"}`} /></button>)}</div></div>
          <Input name="title" placeholder="Review title (optional)" maxLength={120} />
          <Textarea name="comment" placeholder="Share your experience" required maxLength={4000} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Submit review"}</Button>
        </form>
      ) : user ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">Review eligibility is temporarily unavailable. Please try again shortly.</p>
      ) : null}

      <div className="space-y-4">
        {reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this product.</p>}
        {reviews.map((review) => <article key={review.id} className="border-b pb-4"><div className="flex items-center justify-between gap-3"><p className="font-medium">{review.customer_name} <span className="ml-2 text-xs font-normal text-primary">Verified purchase</span></p><div className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? "fill-amber-400 text-amber-500" : "fill-gray-100 text-gray-400"}`} />)}</div></div>{review.title && <h3 className="font-medium mt-2">{review.title}</h3>}<p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{review.comment}</p><time className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString("en-KE")}</time></article>)}
      </div>
    </section>
  );
}
