export type DecimalString = string;

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface SiteSettings {
  business_name: string;
  logo: string | null;
  favicon: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  default_seo_title: string;
  default_seo_description: string;
  featured_product_limit: number;
}

export interface ShopProfile {
  phone: string;
  whatsapp: string;
  email: string;
  location: string;
  currency: string;
  delivery_payment_timing: "BEFORE_DISPATCH" | "ON_DELIVERY";
  pickup_enabled: boolean;
}

export interface HomepageSection {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  button_text: string;
  button_link: string;
  order: number;
}

export interface AdHero {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  order: number;
}

export interface ContentPage {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  show_in_footer: boolean;
  order: number;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  image: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  is_main: boolean;
}

export interface ProductReview {
  id: number;
  customer_name: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  category: number;
  category_name: string;
  name: string;
  slug: string;
  description: string;
  price: DecimalString;
  old_price: DecimalString | null;
  stock: number;
  available_colours: string;
  is_active: boolean;
  is_featured: boolean;
  seo_title: string;
  seo_description: string;
  rating: DecimalString;
  rating_count: number;
  images: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  instructions: string;
  is_active: boolean;
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: "SUPER_ADMIN" | "ADMIN" | "CUSTOMER";
  date_joined: string;
}

export interface CartItem {
  id: number;
  product: number;
  product_detail: Pick<Product, "id" | "name" | "slug" | "price" | "stock" | "images">;
  quantity: number;
  subtotal: DecimalString;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  customer: number | null;
  session_key: string;
  items: CartItem[];
  cart_total: DecimalString;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product: number | null;
  product_slug: string | null;
  product_image: string | null;
  product_name: string;
  quantity: number;
  selected_colour: string;
  unit_price: DecimalString;
  total_price: DecimalString;
}

export type DeliveryMethod = "PICKUP" | "DELIVERY";
export type OrderStatus = "PENDING" | "PROCESSING" | "EN_ROUTE" | "DELIVERED" | "CANCELLED";

export interface Order {
    id: number;
    reference: string;
    customer: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_method: DeliveryMethod;
  delivery_location: string;
  delivery_latitude: string | null;
  delivery_longitude: string | null;
  delivery_place_id: string;
  delivery_zone: "NAIROBI" | "OUTSIDE_NAIROBI" | "COUNTRYWIDE" | "";
  delivery_map_url: string;
  delivery_fee: DecimalString;
  delivery_fee_confirmed: boolean;
  subtotal: DecimalString;
  total: DecimalString;
  status: OrderStatus;
  delivered_at: string | null;
  exchange_requested: boolean;
  exchange_request_notes: string;
  notes: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export type ApiValidationErrors = Record<string, string[] | string>;
