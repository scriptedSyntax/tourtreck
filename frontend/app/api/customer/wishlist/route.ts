import { backendUrl } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { hasOnlyAllowedKeys } from "@/lib/input-security";
import { publicError, readJson, safeUpstreamResponse, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";

export async function GET() {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  return safeUpstreamResponse(fetch(backendUrl("customer/wishlist/"), {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  }));
}

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["product_id", "saved"])) return publicError(400);

  const productId = Number(body.product_id);
  if (!Number.isInteger(productId) || productId < 1 || typeof body.saved !== "boolean") return publicError(400);

  return safeUpstreamResponse(fetch(backendUrl("customer/wishlist/"), {
    method: body.saved ? "POST" : "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify({ product_id: productId }),
    cache: "no-store",
  }));
}
