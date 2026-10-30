import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { hasOnlyAllowedKeys, isValidEmail, normalizeEmail } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

const successMessage = "If an account matches that email, password recovery instructions have been sent.";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request, 4096);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["email"])) return publicError(400);
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return publicError(400, undefined, "Enter a valid email address.");

  try {
    const upstream = await fetch(backendUrl("auth/forgot-password/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Fingerprint": request.headers.get("x-csrf-token") ?? "",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
    await readBackendResponse(upstream);
    if (upstream.status === 429) return publicError(429);
    if (!upstream.ok) return publicError(upstream.status >= 500 ? 503 : 400);
    return noStore(NextResponse.json({ message: successMessage }, { status: 202 }));
  } catch {
    return publicError(503);
  }
}
