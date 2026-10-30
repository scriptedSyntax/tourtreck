import { backendUrl } from "@/lib/api/backend";
import { hasOnlyAllowedKeys, isValidEmail, normalizeEmail } from "@/lib/input-security";
import { publicError, readJson, safeUpstreamResponse, verifyCsrf } from "@/lib/security";

export async function POST(request: Request) {
  if (!verifyCsrf(request)) return publicError(403);
  const { data: body, error } = await readJson(request);
  if (error || !body) return error;
  if (!hasOnlyAllowedKeys(body, ["email"])) return publicError(400);
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return publicError(400);

  return safeUpstreamResponse(fetch(backendUrl("shop/newsletter/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Fingerprint": request.headers.get("x-csrf-token") ?? "",
    },
    body: JSON.stringify({ email }),
    cache: "no-store",
  }));
}
