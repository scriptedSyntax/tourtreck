"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Check, Heart, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/types/api";
import { formatCurrency } from "@/lib/format";
import { productColourHex } from "@/lib/product-colours";

export default function ProductCard({ product, currency, eager = false }: { product: Product; currency: string; eager?: boolean }) {
  const [imageError, setImageError] = useState(false);
  const colours = product.available_colours.split(",").map((colour) => colour.trim()).filter(Boolean);
  const [selectedColour, setSelectedColour] = useState(colours[0] ?? "");
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [wishlistFeedback, setWishlistFeedback] = useState<{ message: string; error: boolean } | null>(null);

  const { addToCart } = useCart();
  const { user, wishlist, toggleWishlist } = useAuth();
  const isLiked = wishlist.includes(product.id);
  const mainImage = product.images.find((image) => image.is_main) ?? product.images[0];
  const hasPreviousPrice = product.old_price !== null && Number.isFinite(Number(product.old_price));
  const hasRating = product.rating_count > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);

    const added = await addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: mainImage?.image ?? "",
      quantity: 1,
      selectedColour,
    });

    setIsAdding(false);
    if (!added) return;
    setJustAdded(true);

    setTimeout(() => setJustAdded(false), 2000);
  };

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUpdatingWishlist) return;
    setIsUpdatingWishlist(true);
    const result = await toggleWishlist(product.id);
    setWishlistFeedback({ message: result.message, error: !result.ok });
    setIsUpdatingWishlist(false);
    window.setTimeout(() => setWishlistFeedback(null), 3000);
  };

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-md border-border/80 bg-card shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md">
      <div className="relative overflow-hidden">
        {user?.role === "CUSTOMER" && <Button
          variant="ghost"
          size="icon"
          aria-label={isLiked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          disabled={isUpdatingWishlist}
          className={cn(
            "absolute right-2 top-2 z-10 h-8 w-8 rounded-sm bg-background/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-background",
            isLiked && "text-destructive"
          )}
          onClick={handleToggleLike}
        >
          <Heart
            name="Like Icon"
            className={cn("h-4 w-4", isLiked && "fill-current")}
          />
        </Button>}

        <Link href={`/product/${product.slug}`} className="block relative">
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            {mainImage && !imageError ? (
              <Image
                src={mainImage.image}
                alt={mainImage.alt_text || product.name}
                width={400}
                height={400}
                loading={eager ? "eager" : "lazy"}
                sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 20vw, 17vw"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-muted-foreground text-sm">
                  Image not available
                </div>
              </div>
            )}
          </div>

        </Link>
      </div>

      <CardContent className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="mb-1.5 flex min-h-4 items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate font-medium uppercase tracking-wide">{product.category_name}</span>
          <span className="flex shrink-0 items-center gap-1" aria-label={hasRating ? `${product.rating} out of 5 from ${product.rating_count} ratings` : "Not yet rated"}>
            <Star className={cn("h-3.5 w-3.5", hasRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50")} />
            {hasRating ? <span>{Number(product.rating).toFixed(1)} ({product.rating_count})</span> : <span>New</span>}
          </span>
        </div>
        {colours.length > 0 && <div className="mb-3 flex flex-wrap gap-2" aria-label="Choose a product colour">{colours.map((colour) => <button key={colour} type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setSelectedColour(colour); }} aria-label={colour} aria-pressed={selectedColour === colour} title={colour} className={`h-7 w-7 rounded-full border-2 ${selectedColour === colour ? "border-primary ring-1 ring-primary ring-offset-1" : "border-border"}`} style={{ backgroundColor: productColourHex(colour) }} />)}</div>}

        <Link href={`/product/${product.slug}`}>
          <h2 className="min-h-10 line-clamp-2 text-sm font-semibold leading-5 text-foreground transition-colors hover:text-primary sm:text-base">
            {product.name}
          </h2>
        </Link>

        <div className="mb-3 mt-2 min-h-11">
          <span className="block whitespace-nowrap text-base font-bold leading-5 text-foreground tabular-nums sm:text-lg">
            {formatCurrency(product.price, currency)}
          </span>
          {hasPreviousPrice && (
            <span className="mt-1 block truncate text-xs text-muted-foreground" title={`Was ${formatCurrency(product.old_price!, currency)}`}>
              Previous <span className="line-through">{formatCurrency(product.old_price!, currency)}</span>
            </span>
          )}
        </div>
        {wishlistFeedback && <p className={cn("mb-2 text-xs", wishlistFeedback.error ? "text-destructive" : "text-primary")} role="status">{wishlistFeedback.message}</p>}

        <Button
          size="sm"
          className={cn(
            "mt-auto w-full rounded-sm transition-colors duration-200",
            justAdded
              ? "bg-green-600 text-white hover:bg-green-600"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={handleAddToCart}
          disabled={isAdding || product.stock < 1}
        >
          {product.stock < 1 ? (
            "Out of stock"
          ) : isAdding ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Adding...
            </div>
          ) : justAdded ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Added to Cart!
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Add to cart
            </div>
          )}
        </Button>
        {justAdded && (
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href="/cart">Proceed to checkout</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
