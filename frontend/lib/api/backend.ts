export const BACKEND_API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/";

export function backendUrl(path: string) {
  return new URL(path.replace(/^\//, ""), BACKEND_API_URL.endsWith("/") ? BACKEND_API_URL : `${BACKEND_API_URL}/`);
}

export async function readBackendResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
