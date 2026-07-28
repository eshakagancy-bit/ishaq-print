"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

export default function ProductGallery({ images, alt }: ProductGalleryProps) {
  const availableImages = useMemo(() => [...new Set(images.filter(Boolean))], [images]);
  const [activeImage, setActiveImage] = useState(availableImages[0] ?? "/brand/eshak-logo.png");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [lightboxOpen]);

  return (
    <div className="printer-gallery product-gallery">
      <button type="button" className="product-gallery-main" onClick={() => setLightboxOpen(true)} aria-label={`تكبير صورة ${alt}`}>
        <Image src={activeImage} alt={alt} width={760} height={620} sizes="(max-width: 800px) 92vw, 48vw" priority />
        <span className="product-gallery-zoom" aria-hidden="true">⌕</span>
      </button>
      {availableImages.length > 1 && <div className="product-gallery-thumbnails" aria-label="صور المنتج">
        {availableImages.map((image, index) => <button
          type="button"
          className={activeImage === image ? "active" : ""}
          onClick={() => setActiveImage(image)}
          aria-label={`عرض صورة المنتج ${index + 1}`}
          key={image}
        ><Image src={image} alt="" width={96} height={76} sizes="76px" /></button>)}
      </div>}
      {lightboxOpen && <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`صورة مكبرة لـ ${alt}`} onMouseDown={() => setLightboxOpen(false)}>
        <button type="button" className="product-lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="إغلاق الصورة المكبرة">×</button>
        <div className="product-lightbox-image" onMouseDown={(event) => event.stopPropagation()}>
          <Image src={activeImage} alt={alt} width={1200} height={960} sizes="95vw" priority />
        </div>
      </div>}
    </div>
  );
}
