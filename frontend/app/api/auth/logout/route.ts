import { backendUrl } from "@/lib/api/backend";
import { clearAuthCookies, REFRESH_COOKIE } from "@/lib/auth-cookies";
import { noStore, publicError, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (refresh) {
    await fetch(backendUrl("auth/logout/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    }).catch(() => null);
  }
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return noStore(response);
}
