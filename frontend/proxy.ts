import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const media = process.env.NEXT_PUBLIC_MEDIA_URL ?? "";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${media} https://maps.geoapify.com https://*.openfreemap.org`,
    "font-src 'self' data: https://*.openfreemap.org",
    "connect-src 'self' https://api.geoapify.com https://maps.geoapify.com https://*.openfreemap.org https://photon.komoot.io https://nominatim.openstreetmap.org",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  if (!request.cookies.has("csrf_token")) {
    response.cookies.set("csrf_token", randomBytes(32).toString("hex"), {
      httpOnly: false, secure: !development, sameSite: "strict", path: "/",
    });
  }
  return response;
}

export const config = { matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico).*)" }] };
