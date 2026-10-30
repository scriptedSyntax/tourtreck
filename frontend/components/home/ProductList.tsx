import type { Product } from "@/types/api";
import ProductCard from "./ProductCard";

interface ProductListProps {
  products: Product[];
  currency: string;
}

export default function ProductList({ products, currency }: ProductListProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 max-w-7xl mx-auto">
      {products.length > 0 ? (
        products.map((product, index) => (
          <ProductCard key={product.id} product={product} currency={currency} eager={index === 0} />
        ))
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-xl font-semibold text-foreground mb-2">No products available</h3>
          <p className="text-muted-foreground">New products will appear here when available.</p>
        </div>
      )}
    </div>
  );
}
