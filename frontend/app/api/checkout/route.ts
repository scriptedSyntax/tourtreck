import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import {
  hasOnlyAllowedKeys,
  isValidEmail,
  isValidPhone,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface CheckoutItem { product: number; quantity: number; selected_colour: string }

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request, 256 * 1024);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, [
    "customer_name", "customer_phone", "customer_email", "delivery_method",
    "delivery_location", "delivery_latitude", "delivery_longitude", "delivery_place_id",
    "notes", "payment_method", "payment_reference", "items",
  ])) return publicError(400);

  const submittedItems = body.items;
  if (!Array.isArray(submittedItems) || submittedItems.length < 1 || submittedItems.length > 50) {
    return publicError(400, undefined, "Please check the items in your cart.");
  }

  const items: CheckoutItem[] = [];
  const productIds = new Set<number>();
  for (const value of submittedItems) {
    if (!value || Array.isArray(value) || typeof value !== "object") return publicError(400);
    const item = value as Record<string, unknown>;
    if (!hasOnlyAllowedKeys(item, ["product", "quantity", "selected_colour"])) return publicError(400);
    const product = Number(item.product);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(product) || product < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100 || productIds.has(product)) {
      return publicError(400, undefined, "Please check the items in your cart.");
    }
    productIds.add(product);
    items.push({ product, quantity, selected_colour: typeof item.selected_colour === "string" ? item.selected_colour.slice(0, 60) : "" });
  }

  const customerName = normalizeText(body.customer_name, 255);
  const customerPhone = normalizePhone(body.customer_phone);
  const customerEmail = normalizeEmail(body.customer_email);
  const deliveryMethod = body.delivery_method;
  const deliveryLocation = normalizeText(body.delivery_location, 500);
  const deliveryLatitude = typeof body.delivery_latitude === "number" ? body.delivery_latitude : null;
  const deliveryLongitude = typeof body.delivery_longitude === "number" ? body.delivery_longitude : null;
  const deliveryPlaceId = normalizeText(body.delivery_place_id, 255);
  const notes = normalizeText(body.notes, 2000);
  const paymentReference = normalizeText(body.payment_reference, 100).toUpperCase();
  const paymentMethod = Number(body.payment_method);
  if (
    customerName.length < 2 || !isValidPhone(customerPhone) || !isValidEmail(customerEmail) ||
    !["PICKUP", "DELIVERY"].includes(String(deliveryMethod)) ||
    (deliveryMethod === "DELIVERY" && (
      !deliveryLocation || deliveryLatitude === null || deliveryLongitude === null ||
      !Number.isFinite(deliveryLatitude) || !Number.isFinite(deliveryLongitude) ||
      deliveryLatitude < -5 || deliveryLatitude > 5.5 || deliveryLongitude < 33.5 || deliveryLongitude > 42.5
    )) ||
    !Number.isInteger(paymentMethod) || paymentMethod < 1 ||
    (paymentReference && !/^[A-Z0-9-]{4,100}$/.test(paymentReference))
  ) return publicError(400);

  try {
    const access = (await cookies()).get(ACCESS_COOKIE)?.value;
    const authHeaders: Record<string, string> = access ? { Authorization: `Bearer ${access}` } : {};
    const cartResponse = await fetch(backendUrl("cart/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Fingerprint": request.headers.get("x-csrf-token") ?? "",
        ...authHeaders,
      },
      body: "{}",
      cache: "no-store",
    });
    const cart = await readBackendResponse(cartResponse);
    if (!cartResponse.ok || !cart || !Number.isInteger(cart.id) || typeof cart.session_key !== "string") {
      return publicError(cartResponse.status);
    }

    const cartHeaders = {
      "Content-Type": "application/json",
      "X-Cart-Token": cart.session_key,
      ...authHeaders,
    };
    if (!access) {
      for (const item of items) {
        const itemResponse = await fetch(backendUrl(`cart/${cart.id}/items/`), {
          method: "POST",
          headers: cartHeaders,
          body: JSON.stringify(item),
          cache: "no-store",
        });
        if (!itemResponse.ok) return publicError(itemResponse.status);
      }
    }

    const checkoutResponse = await fetch(backendUrl("checkout/"), {
      method: "POST",
      headers: cartHeaders,
      body: JSON.stringify({
        cart_id: cart.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_method: deliveryMethod,
        delivery_location: deliveryLocation,
        delivery_latitude: deliveryMethod === "DELIVERY" ? deliveryLatitude : null,
        delivery_longitude: deliveryMethod === "DELIVERY" ? deliveryLongitude : null,
        delivery_place_id: deliveryMethod === "DELIVERY" ? deliveryPlaceId : "",
        notes,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
      }),
      cache: "no-store",
    });
    const checkout = await readBackendResponse(checkoutResponse);
    if (!checkoutResponse.ok) return publicError(checkoutResponse.status);
    if (typeof checkout?.reference !== "string" || !/^[A-Z2-9]{8}$/.test(checkout.reference)) return publicError(502);
    return noStore(NextResponse.json({ reference: checkout.reference }, { status: 201 }));
  } catch {
    return publicError(503);
  }
}
