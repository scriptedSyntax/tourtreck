import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export type PublicError = { code: string; message: string; fields?: Record<string, string[]>; request_id: string };

const STATUS_MESSAGES: Record<number, [string, string]> = {
  400: ["invalid_request", "Please check the information provided."],
  401: ["authentication_required", "Please sign in to continue."],
  403: ["forbidden", "You are not allowed to perform this action."],
  404: ["not_found", "The requested item could not be found."],
  409: ["conflict", "This request conflicts with existing information."],
  413: ["request_too_large", "The submitted information is too large."],
  415: ["unsupported_content", "This request format is not supported."],
  429: ["too_many_requests", "Too many attempts. Please wait and try again."],
};

export function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function publicError(status = 500, requestId: string = randomUUID(), message?: string, codeOverride?: string) {
  const [code, safeMessage] = STATUS_MESSAGES[status] ?? ["service_unavailable", "Something went wrong. Please try again."];
  return noStore(NextResponse.json({ code: codeOverride ?? code, message: message ?? safeMessage, request_id: requestId } satisfies PublicError, { status }));
}

export async function safeUpstreamResponse(upstreamRequest: Response | Promise<Response>, successStatus?: number) {
  let upstream: Response;
  try {
    upstream = await upstreamRequest;
  } catch {
    return publicError(503);
  }
  const requestId = upstream.headers.get("x-request-id") ?? randomUUID();
  if (!upstream.ok) return publicError(upstream.status, requestId);
  if (upstream.status === 204) return noStore(new NextResponse(null, { status: successStatus ?? 204 }));
  try {
    return noStore(NextResponse.json(await upstream.json(), { status: successStatus ?? upstream.status }));
  } catch {
    return publicError(502, requestId);
  }
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<{ data?: Record<string, unknown>; error?: NextResponse }> {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.FRONTEND_URL ?? "http://localhost:3000").origin;
  if (!origin || origin !== expected) return { error: publicError(403) };
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { error: publicError(415) };
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { error: publicError(413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) return { error: publicError(413) };
  try {
    const data = JSON.parse(text);
    if (!data || Array.isArray(data) || typeof data !== "object") return { error: publicError(400) };
    return { data };
  } catch {
    return { error: publicError(400) };
  }
}

export function verifyCsrf(request: Request) {
  const expected = new URL(process.env.FRONTEND_URL ?? "http://localhost:3000").origin;
  if (request.headers.get("origin") !== expected) return false;
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1];
  const header = request.headers.get("x-csrf-token");
  return Boolean(cookie && header && decodeURIComponent(cookie) === header);
}
