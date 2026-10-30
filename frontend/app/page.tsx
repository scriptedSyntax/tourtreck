import ProductList from "@/components/home/ProductList";
import AdHeroBar from "@/components/layout/AdHeroBar";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getAdHeroes, getAllProducts, getHomepageSections, getShopProfile, getSiteSettings } from "@/lib/api/shop";
import Link from "next/link";

export default async function Home() {
  try {
    const [site, profile, sections, featuredProducts, adHeroes] = await Promise.all([
      getSiteSettings(),
      getShopProfile(),
      getHomepageSections(),
      getAllProducts("featured=true"),
      getAdHeroes(),
    ]);
    const hero = sections[0];

    return (
      <div className="bg-background min-h-screen">
        <AdHeroBar hero={adHeroes[0] ?? null} />
        <section className="text-center mx-auto mb-14 space-y-3 max-w-4xl px-4 pt-8 sm:pt-12 lg:pt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {site.business_name}
          </p>
          <h1 className="text-primary text-4xl font-semibold tracking-tight text-balance lg:text-5xl">
            {hero?.title || site.default_seo_title || "Find your next ride"}
          </h1>
          <p className="text-foreground text-base max-w-3xl mx-auto text-balance sm:text-lg">
            {hero?.subtitle || site.default_seo_description}
          </p>
        </section>

        <div id="products" className="px-4 pb-8 sm:pb-12 lg:px-8 lg:pb-16">
          <ProductList products={featuredProducts.slice(0, site.featured_product_limit)} currency={profile.currency} />
          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link href="/products">Browse our catalogue</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    const message = error instanceof ApiError
      ? "The shop is temporarily unavailable."
      : "The shop is temporarily unavailable.";
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">We could not load the shop</h1>
          <p className="text-muted-foreground">{message} Please try again shortly.</p>
        </div>
      </div>
    );
  }
}
