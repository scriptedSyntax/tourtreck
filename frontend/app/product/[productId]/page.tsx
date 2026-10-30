import ProductActions from "@/components/product/ProductActions";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ReviewSection from "@/components/product/ReviewSection";
import { ApiError } from "@/lib/api/client";
import { getProduct, getProductReviews, getShopProfile } from "@/lib/api/shop";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId: slug } = await params;

  try {
    const [product, profile, reviews] = await Promise.all([
      getProduct(slug),
      getShopProfile(),
      getProductReviews(slug),
    ]);
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">Products</Link>
          <span className="mx-2">/</span>
          <span>{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          <ProductImageGallery images={product.images} productName={product.name} productSlug={product.slug} />

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-primary mb-2">{product.category_name}</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground">{product.name}</h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{formatCurrency(product.price, profile.currency)}</span>
              {product.old_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.old_price, profile.currency)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2" aria-label={`${product.rating} out of 5 stars`}>
              <div className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-5 w-5 ${star <= Math.round(Number(product.rating)) ? "fill-amber-400 text-amber-500" : "fill-gray-100 text-gray-400"}`} />)}</div>
              <span className="text-sm text-muted-foreground">{Number(product.rating).toFixed(1)} ({product.rating_count} ratings)</span>
            </div>

            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>

            <p className={product.stock > 0 ? "text-green-700" : "text-destructive"}>
              {product.stock > 0 ? `${product.stock} available` : "Out of stock"}
            </p>

            <ProductActions product={product} />
            <ReviewSection product={product} initialReviews={reviews} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Product unavailable</h1>
          <p className="text-muted-foreground">This product is temporarily unavailable. Please try again shortly.</p>
        </div>
      </div>
    );
  }
}
