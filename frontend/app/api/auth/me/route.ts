import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { ACCESS_COOKIE, clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "@/lib/auth-cookies";
import { hasOnlyAllowedKeys, isValidPhone, normalizePhone, normalizeText } from "@/lib/input-security";
import { noStore, publicError, readJson, safeUpstreamResponse, verifyCsrf } from "@/lib/security";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function fetchProfile(access: string) {
  return fetch(backendUrl("auth/me/"), {
    headers: { Authorization: `Bearer ${access}` },
    cache: "no-store",
  });
}

export async function GET() {
  const cookieStore = await cookies();
  let access = cookieStore.get(ACCESS_COOKIE)?.value;
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return publicError(401);

  try {
    let profileResponse = access ? await fetchProfile(access) : null;
    let rotatedRefresh: string | undefined;
    if ((!profileResponse || profileResponse.status === 401) && refresh) {
      const refreshResponse = await fetch(backendUrl("auth/refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
      const refreshed = await readBackendResponse(refreshResponse);
      if (refreshResponse.ok && typeof refreshed?.access === "string") {
        access = refreshed.access;
        rotatedRefresh = refreshed.refresh ?? refresh;
        profileResponse = await fetchProfile(refreshed.access);
      } else {
        const response = publicError(refreshResponse.status);
        if ([400, 401, 403].includes(refreshResponse.status)) clearAuthCookies(response);
        return response;
      }
    }

    if (!profileResponse) return publicError(401);
    const profile = await readBackendResponse(profileResponse);
    if (!profileResponse.ok) {
      const response = publicError(profileResponse.status);
      if ([401, 403].includes(profileResponse.status)) clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json(profile);
    if (rotatedRefresh && access) setAuthCookies(response, access, rotatedRefresh);
    return noStore(response);
  } catch {
    return publicError(503);
  }
}

export async function PATCH(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return publicError(401);

  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["full_name", "phone"])) return publicError(400);

  const fullName = normalizeText(body.full_name, 255);
  const phone = normalizePhone(body.phone);
  if (fullName.length < 2 || !isValidPhone(phone)) {
    return publicError(400, undefined, "Please enter a valid name and phone number.");
  }

  return safeUpstreamResponse(fetch(backendUrl("auth/me/"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access}` },
    body: JSON.stringify({ full_name: fullName, phone }),
    cache: "no-store",
  }));
}
