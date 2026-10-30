import { backendUrl, readBackendResponse } from "@/lib/api/backend";
import { hasOnlyAllowedKeys, isValidPassword, normalizePassword, normalizeText } from "@/lib/input-security";
import { noStore, publicError, readJson, verifyCsrf } from "@/lib/security";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["account_id", "token", "password"])) return publicError(400);

  const accountId = normalizeText(body.account_id, 36).toLowerCase();
  const token = normalizeText(body.token, 128);
  const password = normalizePassword(body.password);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(accountId) || !/^[A-Za-z0-9-]{1,128}$/.test(token) || !isValidPassword(password)) {
    return publicError(400, undefined, "This setup link is invalid or has expired.", "invalid_setup_link");
  }

  try {
    const upstream = await fetch(backendUrl("auth/set-password/"), {
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
      const message = typeof data?.message === "string"
        ? data.message
        : "We could not set your password. Please try again.";
      return publicError(400, undefined, message, "password_setup_failed");
    }
    return noStore(NextResponse.json({ success: true }));
  } catch {
    return publicError(503);
  }
}
