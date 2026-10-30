import { ApiError } from "@/lib/api/client";
import { getContentPage } from "@/lib/api/shop";
import { notFound } from "next/navigation";

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const page = await getContentPage(slug);
    const paragraphs = page.content
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean);

    return (
      <main className="bg-background px-4 py-12 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Information
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {page.title}
          </h1>
          {page.summary && (
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              {page.summary}
            </p>
          )}

          <div className="mt-10 space-y-6 text-base leading-8 text-foreground">
            {paragraphs.map((paragraph, index) => (
              <p key={`${page.slug}-${index}`}>{paragraph}</p>
            ))}
          </div>

          <p className="mt-10 text-sm text-muted-foreground">
            Last updated {new Date(page.updated_at).toLocaleDateString()}
          </p>
        </article>
      </main>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-semibold mb-2">This information is unavailable</h1>
          <p className="text-muted-foreground">Please try again shortly.</p>
        </div>
      </div>
    );
  }
}
