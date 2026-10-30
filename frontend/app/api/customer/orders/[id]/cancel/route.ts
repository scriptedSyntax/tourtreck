import { backendUrl } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { publicError, safeUpstreamResponse, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(request)) return publicError(403);
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1) return publicError(404);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  return safeUpstreamResponse(fetch(backendUrl(`customer/orders/${id}/cancel/`), {
    method: "POST",
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  }));
}
