import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EmailPreviewsShortcut() {
  if (process.env.NODE_ENV !== "development") notFound();
  const apiUrl = new URL(process.env.API_URL ?? "http://127.0.0.1:8000/api/");
  apiUrl.pathname = "/email-previews/";
  apiUrl.search = "";
  apiUrl.hash = "";
  redirect(apiUrl.toString());
}
