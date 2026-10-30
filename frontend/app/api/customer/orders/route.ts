import { backendUrl } from "@/lib/api/backend";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";
import { publicError, safeUpstreamResponse } from "@/lib/security";
import { cookies } from "next/headers";

export async function GET() {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);
  return safeUpstreamResponse(fetch(backendUrl("customer/orders/"), {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  }));
}
