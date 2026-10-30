import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { getContentPages, getShopProfile, getSiteSettings } from "@/lib/api/shop";
import type { ContentPage, ShopProfile, SiteSettings } from "@/types/api";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cache, type CSSProperties } from "react";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const fallbackSite: SiteSettings = {
  business_name: "Shop",
  logo: null,
  favicon: null,
  primary_color: "#F59E0B",
  secondary_color: "#64748B",
  accent_color: "#FBBF24",
  default_seo_title: "Online Shop",
  default_seo_description: "Browse our latest products.",
  featured_product_limit: 10,
};

const fallbackProfile: ShopProfile = {
  phone: "",
  whatsapp: "",
  email: "",
  location: "",
  currency: "KES",
  delivery_payment_timing: "BEFORE_DISPATCH",
  pickup_enabled: false,
};

const getLayoutData = cache(async () => {
  try {
    const [site, profile, pages] = await Promise.all([
      getSiteSettings(),
      getShopProfile(),
      getContentPages(),
    ]);
    return { site, profile, pages };
  } catch {
    return { site: fallbackSite, profile: fallbackProfile, pages: [] as ContentPage[] };
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getLayoutData();
  return {
    title: { default: site.default_seo_title || site.business_name, template: `%s | ${site.business_name}` },
    description: site.default_seo_description,
    icons: site.favicon ? { icon: site.favicon } : undefined,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { site, profile, pages } = await getLayoutData();
  const colors = {
    "--primary": site.primary_color,
    "--secondary": site.secondary_color,
    "--accent": site.accent_color,
    "--ring": site.primary_color,
  } as CSSProperties;

  return (
    <html lang="en" style={colors}>
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <AuthProvider><CartProvider>
          <Header businessName={site.business_name} logo={site.logo} />
          <main className="flex-grow">{children}</main>
          <Footer site={site} profile={profile} pages={pages} />
        </CartProvider></AuthProvider>
      </body>
    </html>
  );
}
