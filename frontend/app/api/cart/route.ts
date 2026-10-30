import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { hasOnlyAllowedKeys } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type SubmittedItem = { product: number; quantity: number; selected_colour: string };

async function customerCart(access: string) {
  const response = await fetch(backendUrl("cart/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: "{}",
    cache: "no-store",
  });
  return { response, cart: await readBackendResponse(response) };
}

async function cartResponse(access: string, cartId: number) {
  const response = await fetch(backendUrl(`cart/${cartId}/`), {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  const data = await readBackendResponse(response);
  if (!response.ok || !data || !Array.isArray(data.items)) return publicError(response.status);
  const items = data.items.map((item: Record<string, unknown>) => ({
    product: item.product,
    quantity: item.quantity,
    selected_colour: item.selected_colour,
    product_detail: item.product_detail,
  }));
  return noStore(NextResponse.json({ items }));
}

function validItem(value: unknown): SubmittedItem | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!hasOnlyAllowedKeys(item, ["product", "quantity", "selected_colour"])) return null;
  const product = Number(item.product);
  const quantity = Number(item.quantity);
  if (!Number.isInteger(product) || product < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return null;
  const selected_colour = typeof item.selected_colour === "string" ? item.selected_colour.trim().slice(0, 60) : "";
  return { product, quantity, selected_colour };
}

export async function GET() {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { response, cart } = await customerCart(access);
  if (!response.ok || !Number.isInteger(cart?.id)) return publicError(response.status);
  return cartResponse(access, cart.id);
}

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { data: body, error } = await readJson(request, 32 * 1024);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["items", "merge"])) return publicError(400);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) return publicError(400);
  const items = body.items.map(validItem);
  if (items.some((item) => item === null)) return publicError(400);
  const unique = new Set(items.map((item) => item!.product));
  if (unique.size !== items.length) return publicError(400);

  if (body.merge === true) {
    const merged = await fetch(backendUrl("cart/merge/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
      body: JSON.stringify({ items }),
      cache: "no-store",
    });
    const mergedData = await readBackendResponse(merged);
    if (!merged.ok || !Number.isInteger(mergedData?.id)) return publicError(merged.status);
    return cartResponse(access, mergedData.id);
  }

  const { response, cart } = await customerCart(access);
  if (!response.ok || !Number.isInteger(cart?.id)) return publicError(response.status);
  for (const item of items as SubmittedItem[]) {
    const result = await fetch(backendUrl(`cart/${cart.id}/items/`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
      body: JSON.stringify(item),
      cache: "no-store",
    });
    if (!result.ok) return publicError(result.status, undefined, "One of the products could not be added to your cart.");
  }
  return cartResponse(access, cart.id);
}

export async function PATCH(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["product", "quantity", "selected_colour"])) return publicError(400);
  const item = validItem(body);
  if (!item) return publicError(400);
  const { response, cart } = await customerCart(access);
  if (!response.ok || !Number.isInteger(cart?.id) || !Array.isArray(cart.items)) return publicError(response.status);
  const existing = cart.items.find((value: Record<string, unknown>) => Number(value.product) === item.product);
  if (!existing || !Number.isInteger(existing.id)) return publicError(404);
  const updated = await fetch(backendUrl(`cart/${cart.id}/items/${existing.id}/`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify({ quantity: item.quantity }),
    cache: "no-store",
  });
  if (!updated.ok) return publicError(updated.status, undefined, "That quantity is not currently available.");
  return cartResponse(access, cart.id);
}

export async function DELETE(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["product"])) return publicError(400);
  const product = body.product === undefined ? null : Number(body.product);
  if (product !== null && (!Number.isInteger(product) || product < 1)) return publicError(400);
  const { response, cart } = await customerCart(access);
  if (!response.ok || !Number.isInteger(cart?.id) || !Array.isArray(cart.items)) return publicError(response.status);
  if (product === null) {
    const cleared = await fetch(backendUrl(`cart/${cart.id}/clear/`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    if (!cleared.ok) return publicError(cleared.status);
  } else {
    const existing = cart.items.find((value: Record<string, unknown>) => Number(value.product) === product);
    if (existing && Number.isInteger(existing.id)) {
      const removed = await fetch(backendUrl(`cart/${cart.id}/items/${existing.id}/`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${access}` },
        cache: "no-store",
      });
      if (!removed.ok) return publicError(removed.status);
    }
  }
  return cartResponse(access, cart.id);
}
