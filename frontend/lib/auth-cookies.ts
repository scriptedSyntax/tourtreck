import type { NextResponse } from "next/server";

const production = process.env.NODE_ENV === "production";
export const ACCESS_COOKIE = production ? "__Host-access_token" : "access_token";
export const REFRESH_COOKIE = production ? "__Host-refresh_token" : "refresh_token";

export function setAuthCookies(response: NextResponse, access: string, refresh: string) {
  response.cookies.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30,
  });
  response.cookies.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}
