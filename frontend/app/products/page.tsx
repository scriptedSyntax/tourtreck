import ProductList from "@/components/home/ProductList";
import FlexiblePurchaseCard from "@/components/products/FlexiblePurchaseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { getAllProducts, getCategories, getShopProfile } from "@/lib/api/shop";
import { normalizeSearch } from "@/lib/input-security";
import Link from "next/link";

type CatalogueParams = {
  search?: string;
  category?: string;
  sort?: string;
  view?: string;
};

const SORT_OPTIONS = new Set(["newest", "price-low", "price-high", "name"]);

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogueParams> }) {
  try {
    const rawParams = await searchParams;
    const search = normalizeSearch(rawParams.search);
    const selectedSort = SORT_OPTIONS.has(rawParams.sort ?? "") ? rawParams.sort! : "newest";
    const featuredOnly = rawParams.view === "featured";
    const [categories, profile] = await Promise.all([getCategories(), getShopProfile()]);
    const selectedCategory = categories.some((category) => category.slug === rawParams.category)
      ? rawParams.category!
      : "";

    const apiParams = new URLSearchParams();
    if (search) apiParams.set("search", search);
    if (selectedCategory) apiParams.set("category", selectedCategory);
    if (featuredOnly) apiParams.set("featured", "yes");

    const products = await getAllProducts(apiParams.toString());
    products.sort((left, right) => {
      if (selectedSort === "price-low") return Number(left.price) - Number(right.price);
      if (selectedSort === "price-high") return Number(right.price) - Number(left.price);
      if (selectedSort === "name") return left.name.localeCompare(right.name);
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });

    const hasFilters = Boolean(search || selectedCategory || featuredOnly || rawParams.sort);

    return (
      <main className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Our catalogue</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">All products</h1>
            <p className="mt-2 text-muted-foreground">Browse the complete collection and find the right product for you.</p>
          </div>

          <FlexiblePurchaseCard />

          <form action="/products" method="get" className="mb-6 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_200px_180px_auto_auto]">
            <Input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search products"
              maxLength={80}
              aria-label="Search products"
            />
            <select name="category" defaultValue={selectedCategory} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.filter((category) => !category.parent).map((category) => <optgroup key={category.id} label={category.name}>
                <option value={category.slug}>{category.name} — all</option>
                {categories.filter((sub) => sub.parent === category.id).map((sub) => <option key={sub.id} value={sub.slug}>{sub.name}</option>)}
              </optgroup>)}
            </select>
            <select name="sort" defaultValue={selectedSort} className="h-9 rounded-md border border-input bg-background px-3 text-sm" aria-label="Sort products">
              <option value="newest">Newest</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="name">Name</option>
            </select>
            <label className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md border border-input px-3 text-sm">
              <input type="checkbox" name="view" value="featured" defaultChecked={featuredOnly} className="accent-primary" />
              Featured
            </label>
            <Button type="submit">Apply</Button>
          </form>

          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{products.length} {products.length === 1 ? "product" : "products"}</p>
            {hasFilters && <Link href="/products" className="text-sm font-medium text-primary hover:underline">Clear filters</Link>}
          </div>

          <ProductList products={products} currency={profile.currency} />
        </div>
      </main>
    );
  } catch (error) {
    const message = error instanceof ApiError
      ? "The catalogue is temporarily unavailable."
      : "The catalogue is temporarily unavailable.";
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">We could not load the products</h1>
          <p className="text-muted-foreground">{message} Please try again shortly.</p>
        </div>
      </div>
    );
  }
}
