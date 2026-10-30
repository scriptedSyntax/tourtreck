"use client";

import BikeErrorArt from "@/components/error/BikeErrorArt";
import { Button } from "@/components/ui/button";
import { Home, RefreshCw, Wrench } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[70vh] bg-background px-4 py-16 text-center">
      <BikeErrorArt mood="repair" />
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Something needs a quick tune-up</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        The shop hit a temporary bump.
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
        No worries — you can retry, go back home, or contact us and we&apos;ll help you continue.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/"><Home className="mr-2 h-4 w-4" />Go home</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/contact"><Wrench className="mr-2 h-4 w-4" />Contact support</Link>
        </Button>
      </div>
    </main>
  );
}
