import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { hasOnlyAllowedKeys, isValidPassword, normalizePassword, normalizeText } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request, 4096);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["account_id", "token", "password"])) return publicError(400);

  const accountId = normalizeText(body.account_id, 36).toLowerCase();
  const token = normalizeText(body.token, 128);
  const password = normalizePassword(body.password);
  const validAccount = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(accountId);
  if (!validAccount || !/^[A-Za-z0-9-]{1,128}$/.test(token) || !isValidPassword(password)) {
    return publicError(400, undefined, "This reset link is invalid or has expired.", "invalid_reset_link");
  }

  try {
    const upstream = await fetch(backendUrl("auth/reset-password/"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Fingerprint": request.headers.get("x-csrf-token") ?? "",
      },
      body: JSON.stringify({ account_id: accountId, token, password }),
      cache: "no-store",
    });
    const data = await readBackendResponse(upstream);
    if (!upstream.ok) {
      const message = typeof data?.message === "string" ? data.message : "This reset link is invalid or has expired.";
      return publicError(upstream.status === 429 ? 429 : 400, undefined, message, "password_reset_failed");
    }
    return noStore(NextResponse.json({ success: true }));
  } catch {
    return publicError(503);
  }
}
