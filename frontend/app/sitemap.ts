import { getAllProducts, getContentPages } from "@/lib/api/shop";
import type { MetadataRoute } from "next";

const siteUrl = (process.env.FRONTEND_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const [products, contentPages] = await Promise.all([
      getAllProducts(),
      getContentPages(),
    ]);

    routes.push(
      ...products.map((product) => ({
        url: `${siteUrl}/product/${product.slug}`,
        lastModified: new Date(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...contentPages.map((page) => ({
        url: `${siteUrl}/info/${page.slug}`,
        lastModified: new Date(page.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    );
  } catch {
    // Static public routes remain discoverable if catalogue data is unavailable.
  }

  return routes;
}
