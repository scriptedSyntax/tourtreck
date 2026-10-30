import BikeErrorArt from "@/components/error/BikeErrorArt";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Wrench } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-16 text-center">
      <BikeErrorArt mood="lost" />
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">404</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        This route took a wrong turn.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        The page you&apos;re looking for isn&apos;t here. Let&apos;s get you back to the bicycle shop.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">Browse bicycles</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contact"><Wrench className="mr-2 h-4 w-4" />Ask for help</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/cart"><ShoppingCart className="mr-2 h-4 w-4" />View cart</Link>
        </Button>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        Try searching from the navbar, or jump back to <Link href="/#products" className="font-medium text-primary hover:underline"><Search className="mr-1 inline h-4 w-4" />products</Link>.
      </div>
    </main>
  );
}
