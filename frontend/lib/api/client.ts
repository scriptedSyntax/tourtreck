import type { ApiValidationErrors } from "@/types/api";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly details: ApiValidationErrors | string | null,
  ) {
    super("The request could not be completed.");
    this.name = "ApiError";
  }
}

function buildApiUrl(path: string) {
  return new URL(path.replace(/^\//, ""), API_URL.endsWith("/") ? API_URL : `${API_URL}/`);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { next?: { revalidate?: number } } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(503, null);
  }

  if (!response.ok) {
    let details: ApiValidationErrors | string | null = null;
    try {
      details = await response.json();
    } catch {
      details = await response.text().catch(() => null);
    }
    throw new ApiError(response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
