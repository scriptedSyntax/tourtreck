"use client";

import { useCart } from "@/context/CartContext";
import { LoaderCircle, Menu, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { secureJsonHeaders, useAuth } from "@/context/AuthContext";
import { normalizeSearch } from "@/lib/input-security";
import { Button } from "../ui/button";

export default function Header({ businessName, logo }: { businessName: string; logo: string | null }) {
  const router = useRouter();
  const { cart } = useCart();
  const cartCount =
    cart?.reduce((total, item) => total + item.quantity, 0) || 0;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = Boolean(user);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const isActivePath = (path: string) => pathname === path;

  const navItems = [
    { href: "/products", label: "Products" },
    { href: "/contact", label: "Contact" },
  ];

  async function logout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: secureJsonHeaders() });
    } finally {
      window.location.href = "/";
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSearch = normalizeSearch(searchQuery);
    setSearchQuery(cleanSearch);
    setIsSearchOpen(false);
    setIsMobileOpen(false);

    if (!cleanSearch) {
      startNavigation(() => router.push("/products"));
      return;
    }

    const params = new URLSearchParams({ search: cleanSearch });
    startNavigation(() => router.push(`/products?${params.toString()}`));
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-primary/95 backdrop-blur-xl border-b border-white/15 shadow-lg"
          : "bg-primary backdrop-blur-md border-b border-white/10 shadow-sm"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8 lg:space-x-12">
            <Link
              className="text-2xl tracking-tight text-white hover:text-white/85 transition-colors"
              href="/"
              aria-label={`${businessName} home`}
            >
              {logo ? (
                <Image src={logo} alt={businessName} width={160} height={48} className="h-10 w-auto object-contain" priority />
              ) : (
                <span className="font-semibold">{businessName}</span>
              )}
            </Link>

            <nav
              className="hidden md:flex items-center space-x-1"
              role="navigation"
              aria-label="Main navigation"
            >
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`relative py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActivePath(href)
                      ? "bg-white/20 text-white shadow-md"
                      : "text-white/90 hover:bg-white/15 hover:text-white"
                  }`}
                  aria-current={isActivePath(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
              {isAuthenticated && <Link href="/account" className="relative py-2 px-4 rounded-lg text-sm font-medium text-white/90 hover:bg-white/15 hover:text-white">Account</Link>}
            </nav>
          </div>

          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <form className="relative w-full" onSubmit={submitSearch}>
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.slice(0, 80))}
                className="w-full pl-10 pr-4 py-2 text-sm border border-white/25 bg-white/95 text-gray-900 placeholder:text-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                aria-label="Search products"
                maxLength={80}
              />
              {isNavigating ? <LoaderCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" /> : <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />}
            </form>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-white/15 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white" />
            </button>

            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-full hover:bg-white/15 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileOpen}
            >
              {isMobileOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>

            <Link
              href="/cart"
              className="relative p-2 rounded-full hover:bg-white/15 transition-all duration-200 group"
              aria-label={`Shopping cart with ${cartCount} items`}
            >
              <ShoppingCart className="h-6 w-6 text-white transition-colors" />
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 bg-white text-primary text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
                  aria-label={`${cartCount} items in cart`}
                >
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {!authLoading && !isAuthenticated && <div className="hidden sm:flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-sm text-white hover:bg-white/15 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" variant="default" className="text-sm bg-white text-primary hover:bg-white/90">
                  Sign Up
                </Button>
              </Link>
            </div>}
            {isAuthenticated && <Button variant="ghost" size="sm" onClick={logout} disabled={isLoggingOut} className="hidden sm:inline-flex text-white hover:bg-white/15 hover:text-white">{isLoggingOut && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{isLoggingOut ? "Logging out..." : "Log out"}</Button>}
          </div>
        </div>

        {isSearchOpen && (
          <div className="lg:hidden mt-4 animate-in slide-in-from-top duration-200">
            <form className="relative" onSubmit={submitSearch}>
              <input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.slice(0, 80))}
                className="w-full pl-10 pr-4 py-3 text-sm border border-white/25 bg-white text-gray-900 placeholder:text-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                aria-label="Search products"
                maxLength={80}
                autoFocus
              />
              {isNavigating ? <LoaderCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" /> : <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />}
            </form>
          </div>
        )}

        {isMobileOpen && (
          <nav
            className="md:hidden mt-4 animate-in slide-in-from-top duration-200"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col space-y-3 pb-4 border-b border-white/20">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMobileMenu}
                  className={`text-sm font-medium py-2 px-3 rounded-lg transition-all ${
                    isActivePath(href)
                      ? "bg-white/20 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                  aria-current={isActivePath(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
              {isAuthenticated && <Link href="/account" onClick={closeMobileMenu} className="text-sm font-medium py-2 px-3 rounded-lg text-white/90 hover:bg-white/15 hover:text-white">Account</Link>}
            </div>

            {!authLoading && !isAuthenticated && <div className="flex flex-col space-y-3 pt-4 sm:hidden">
              <Button variant="outline" className="w-full text-sm border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white" asChild>
                <Link href="/login" onClick={closeMobileMenu}>
                  Sign In
                </Link>
              </Button>
              <Button className="w-full text-sm bg-white text-primary hover:bg-white/90" variant="default" asChild>
                <Link href="/signup" onClick={closeMobileMenu}>
                  Sign Up
                </Link>
              </Button>
            </div>}
            {isAuthenticated && <Button variant="outline" className="mt-4 w-full border-white/30 bg-transparent text-white hover:bg-white/15 hover:text-white sm:hidden" onClick={logout} disabled={isLoggingOut}>{isLoggingOut && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}{isLoggingOut ? "Logging out..." : "Log out"}</Button>}
          </nav>
        )}
      </div>
    </header>
  );
}
