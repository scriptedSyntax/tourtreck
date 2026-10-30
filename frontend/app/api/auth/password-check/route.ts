import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { hasOnlyAllowedKeys, isValidEmail, normalizeEmail, normalizePassword, normalizeText } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["email", "full_name", "password"])) return publicError(400);
  const payload = {
    email: normalizeEmail(body.email),
    full_name: normalizeText(body.full_name, 255),
    password: normalizePassword(body.password),
  };
  if (!isValidEmail(payload.email) || payload.full_name.length < 2 || payload.password.length > 128) return publicError(400);

  try {
    const upstream = await fetch(backendUrl("auth/password-check/"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Client-Fingerprint": request.headers.get("x-csrf-token") ?? "" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const data = await readBackendResponse(upstream);
    if (!upstream.ok) {
      const message = typeof data?.message === "string" ? data.message : "Choose a stronger password.";
      return publicError(400, undefined, message, "weak_password");
    }
    return noStore(NextResponse.json({ valid: true }));
  } catch {
    return publicError(503);
  }
}
