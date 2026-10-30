import { backendUrl } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { hasOnlyAllowedKeys, normalizeText } from "@/lib/input-security";
import { publicError, readJson, safeUpstreamResponse, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { slug } = await params;
  return safeUpstreamResponse(fetch(backendUrl(`shop/products/${encodeURIComponent(slug)}/review-eligibility/`), {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  }));
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!verifyCsrf(request)) return publicError(403);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["rating", "title", "comment"])) return publicError(400);

  const rating = Number(body.rating);
  const title = normalizeText(body.title, 120);
  const comment = normalizeText(body.comment, 4000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) return publicError(400);

  const { slug } = await params;
  try {
    const upstream = await fetch(backendUrl(`shop/products/${encodeURIComponent(slug)}/reviews/`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
      body: JSON.stringify({ rating, title, comment }),
      cache: "no-store",
    });
    if (upstream.status === 403) {
      return publicError(403, undefined, "Purchase this product before rating it.", "purchase_required");
    }
    return safeUpstreamResponse(upstream);
  } catch {
    return publicError(503);
  }
}
