import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { setAuthCookies } from "@/lib/auth-cookies";
import { hasOnlyAllowedKeys, isValidEmail, isValidPassword, normalizeEmail, normalizePassword } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["email", "password"])) return publicError(400);

  const email = normalizeEmail(body.email);
  const password = normalizePassword(body.password);
  if (!isValidEmail(email) || !isValidPassword(password)) {
    return publicError(400, undefined, "We couldn't sign you in. Check your email and password.");
  }

  try {
    const backend = await fetch(backendUrl("auth/login/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    const data = await readBackendResponse(backend);
    if (!backend.ok || !data) return publicError(backend.status, undefined, backend.status < 500
      ? "We couldn't sign you in. Check your email and password."
      : undefined);
    if (typeof data.access !== "string" || typeof data.refresh !== "string" || !data.user) {
      return publicError(502);
    }

    const response = NextResponse.json({ user: data.user });
    setAuthCookies(response, data.access, data.refresh);
    return noStore(response);
  } catch {
    return publicError(503);
  }
}
