import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { setAuthCookies } from "@/lib/auth-cookies";
import {
  hasOnlyAllowedKeys,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  normalizeEmail,
  normalizePassword,
  normalizePhone,
  normalizeText,
} from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["email", "full_name", "phone", "password"])) return publicError(400);

  const payload = {
    email: normalizeEmail(body.email),
    full_name: normalizeText(body.full_name, 255),
    phone: normalizePhone(body.phone),
    password: normalizePassword(body.password),
  };
  if (!isValidEmail(payload.email) || payload.full_name.length < 2 || !isValidPhone(payload.phone) || !isValidPassword(payload.password)) {
    return publicError(400, undefined, "We couldn't create your account. Please check your details.");
  }

  try {
    const fingerprint = request.headers.get("x-csrf-token") ?? "";
    const registration = await fetch(backendUrl("auth/register/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Fingerprint": fingerprint },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    await readBackendResponse(registration);
    if (!registration.ok) return publicError(registration.status, undefined, registration.status === 400
      ? "We couldn't create your account. Please check your details."
      : undefined);

    const login = await fetch(backendUrl("auth/login/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: payload.email, password: payload.password }),
      cache: "no-store",
    });
    const loginData = await readBackendResponse(login);
    if (!login.ok || !loginData) return publicError(login.status);
    if (typeof loginData.access !== "string" || typeof loginData.refresh !== "string" || !loginData.user) {
      return publicError(502);
    }

    const response = NextResponse.json({ user: loginData.user }, { status: 201 });
    setAuthCookies(response, loginData.access, loginData.refresh);
    return noStore(response);
  } catch {
    return publicError(503);
  }
}
