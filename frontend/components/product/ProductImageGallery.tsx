"use client";

import type { ProductImage } from "@/types/api";
import { Expand } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = { images: ProductImage[]; productName: string; productSlug: string };

export default function ProductImageGallery({ images, productName, productSlug }: Props) {
  const orderedImages = useMemo(
    () => [...images].sort((left, right) => Number(right.is_main) - Number(left.is_main)),
    [images],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const selectedImage = orderedImages[selectedIndex];

  if (!selectedImage) {
    return <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-muted-foreground">Image coming soon</div>;
  }

  return (
    <div>
      <Link
        href={`/product/${productSlug}/images?index=${selectedIndex}`}
        className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`View images of ${productName}`}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setZoom({ active: true, x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
        }}
        onMouseLeave={() => setZoom((current) => ({ ...current, active: false }))}
      >
        <Image
          src={selectedImage.image}
          alt={selectedImage.alt_text || productName}
          fill
          priority
          sizes="(max-width: 1023px) calc(100vw - 2rem), 50vw"
          className="object-cover transition-transform duration-150"
          style={{ transform: zoom.active ? "scale(2)" : "scale(1)", transformOrigin: `${zoom.x}% ${zoom.y}%` }}
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-sm bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
          <Expand className="h-4 w-4" /> View all images
        </span>
      </Link>
      {orderedImages.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Product images">
          {orderedImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-sm border-2 bg-muted transition-colors ${index === selectedIndex ? "border-primary" : "border-transparent hover:border-border"}`}
              aria-label={`View image ${index + 1} of ${orderedImages.length}`}
              aria-current={index === selectedIndex ? "true" : undefined}
            >
              <Image src={image.image} alt={image.alt_text || `${productName} image ${index + 1}`} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
