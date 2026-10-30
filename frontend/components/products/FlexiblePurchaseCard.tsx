"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function FlexiblePurchaseCard() {
  const { user, loading } = useAuth();
  const isSignedIn = Boolean(user);

  return (
    <section className="mb-6 rounded-lg border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-background p-5 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Flexible Purchase</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignedIn
              ? "Lipa pole pole with flexible payments that make it easier to get the bicycle you want."
              : "Create an account to access Flexible Purchase. Get your ride fast with Lipa Pole Pole."}
          </p>
        </div>
        <Button asChild={!loading} type="button" disabled={loading}>
          {loading ? (
            <span>Checking account...</span>
          ) : (
            <Link href={isSignedIn ? "/account#flexible-purchase" : "/signup"}>
              {isSignedIn ? "View in account" : "Create account"}
            </Link>
          )}
        </Button>
      </div>
    </section>
  );
}
