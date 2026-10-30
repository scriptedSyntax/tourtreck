import { apiRequest } from "@/lib/api/client";
import type {
  Category,
  AdHero,
  ContentPage,
  HomepageSection,
  PaginatedResponse,
  PaymentMethod,
  Product,
  ProductReview,
  ShopProfile,
  SiteSettings,
} from "@/types/api";

export const getSiteSettings = () =>
  apiRequest<SiteSettings>("shop/site/", { cache: "no-store" });

export const getShopProfile = () =>
  apiRequest<ShopProfile>("shop/profile/", { cache: "no-store" });

export const getHomepageSections = () =>
  apiRequest<HomepageSection[]>("shop/homepage-sections/", { cache: "no-store" });

export const getAdHeroes = () =>
  apiRequest<AdHero[]>("shop/ad-heroes/", { cache: "no-store" });

export const getContentPages = () =>
  apiRequest<ContentPage[]>("shop/content/", { cache: "no-store" });

export const getContentPage = (slug: string) =>
  apiRequest<ContentPage>(`shop/content/${encodeURIComponent(slug)}/`, {
    cache: "no-store",
  });

export const getCategories = () =>
  apiRequest<Category[]>("shop/categories/", { cache: "no-store" });

export const getProducts = (query = "") =>
  apiRequest<PaginatedResponse<Product>>(`shop/products/${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

export async function getAllProducts(query = "") {
  const products: Product[] = [];

  for (let page = 1; page <= 100; page += 1) {
    const params = new URLSearchParams(query);
    params.set("page", String(page));
    const result = await getProducts(params.toString());
    products.push(...result.results);
    if (!result.next) break;
  }

  return products;
}

export const getProduct = (slug: string) =>
  apiRequest<Product>(`shop/products/${encodeURIComponent(slug)}/`, {
    cache: "no-store",
  });

export const getProductReviews = (slug: string) =>
  apiRequest<ProductReview[]>(`shop/products/${encodeURIComponent(slug)}/reviews/`, {
    cache: "no-store",
  });

export const getPaymentMethods = () =>
  apiRequest<PaymentMethod[]>("shop/payment-methods/", { cache: "no-store" });
