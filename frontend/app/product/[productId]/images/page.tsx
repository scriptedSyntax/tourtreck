import ProductImageViewer from "@/components/product/ProductImageViewer";
import { getProduct } from "@/lib/api/shop";
import { notFound } from "next/navigation";

export default async function ProductImagesPage({ params, searchParams }: { params: Promise<{ productId: string }>; searchParams: Promise<{ index?: string }> }) {
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  try {
    const product = await getProduct(productId);
    const index = Number(query.index ?? 0);
    return <ProductImageViewer images={product.images} name={product.name} slug={product.slug} initialIndex={Number.isInteger(index) ? index : 0} />;
  } catch {
    notFound();
  }
}
