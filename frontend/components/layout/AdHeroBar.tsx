import type { AdHero } from "@/types/api";
import Image from "next/image";
import Link from "next/link";

export default function AdHeroBar({ hero }: { hero: AdHero | null }) {
  if (!hero) {
    return null;
  }

  const href = hero.link || "#products";
  const isExternal = href.startsWith("https://");
  const content = (
    <div className="relative min-h-[180px] overflow-hidden sm:min-h-[240px]">
      <Image
        src={hero.image}
        alt={hero.title}
        fill
        priority
        sizes="100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      <div className="container relative z-10 mx-auto flex min-h-[180px] items-center px-4 py-8 text-white sm:min-h-[240px] sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
            Featured
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            {hero.title}
          </h2>
          {hero.subtitle && (
            <p className="mt-3 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              {hero.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className="bg-background px-4 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-primary shadow-xl shadow-black/10">
      {isExternal ? (
        <a href={href} target="_blank" rel="noreferrer" className="group block">
          {content}
        </a>
      ) : (
        <Link href={href} className="group block">
          {content}
        </Link>
      )}
      </div>
    </section>
  );
}
