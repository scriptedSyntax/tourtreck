"use client";

import { Button } from "@/components/ui/button";
import type { ProductImage } from "@/types/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ProductImageViewer({ images, name, slug, initialIndex }: { images: ProductImage[]; name: string; slug: string; initialIndex: number }) {
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), images.length - 1));
  const image = images[index];
  if (!image) return <p className="p-8 text-center text-muted-foreground">No product images are available.</p>;
  const move = (direction: number) => setIndex((current) => (current + direction + images.length) % images.length);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <nav className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-muted-foreground">Product images</p><h1 className="text-xl font-semibold">{name}</h1></div>
        <Button asChild variant="outline"><Link href={`/product/${slug}`}>Back to product</Link></Button>
      </nav>
      <div className="relative flex min-h-[55vh] flex-1 items-center justify-center overflow-hidden rounded-lg bg-neutral-950">
        <div className="relative h-[65vh] w-full">
          <Image src={image.image} alt={image.alt_text || name} fill sizes="100vw" className="object-contain" priority />
        </div>
        {images.length > 1 && <>
          <Button type="button" variant="outline" onClick={() => move(-1)} aria-label="Previous image" className="absolute left-3 top-1/2 -translate-y-1/2"><ChevronLeft /></Button>
          <Button type="button" variant="outline" onClick={() => move(1)} aria-label="Next image" className="absolute right-3 top-1/2 -translate-y-1/2"><ChevronRight /></Button>
        </>}
        <span className="absolute bottom-3 right-3 rounded bg-black/70 px-3 py-1 text-sm text-white">{index + 1} / {images.length}</span>
      </div>
      {images.length > 1 && <nav aria-label="Choose image" className="flex justify-center gap-2 overflow-x-auto py-1">{images.map((item, imageIndex) => <button key={item.id} type="button" onClick={() => setIndex(imageIndex)} aria-label={`Show image ${imageIndex + 1}`} aria-current={index === imageIndex} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${index === imageIndex ? "border-primary" : "border-transparent"}`}><Image src={item.image} alt="" fill sizes="64px" className="object-cover" /></button>)}</nav>}
    </main>
  );
}
