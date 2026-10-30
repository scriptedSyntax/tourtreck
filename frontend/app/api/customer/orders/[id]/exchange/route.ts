import { backendUrl } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { publicError, readJson, safeUpstreamResponse, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data, error } = await readJson(request, 4096);
  if (error || !data || typeof data.notes !== "string" || !data.notes.trim() || data.notes.length > 2000) return error ?? publicError(400);
  const { id } = await params;
  if (!/^\d+$/.test(id)) return publicError(400);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  return safeUpstreamResponse(fetch(backendUrl(`customer/orders/${id}/exchange/`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify({ notes: data.notes.trim() }),
    cache: "no-store",
  }));
}
