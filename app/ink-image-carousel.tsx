"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type InkImageCarouselProps = {
  images: string[];
  alt: string;
  variant?: "card" | "quick";
};

export default function InkImageCarousel({ images, alt, variant = "card" }: InkImageCarouselProps) {
  const availableImages = [...new Set(images.filter(Boolean))];
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const multiple = availableImages.length > 1;
  const show = (index: number) => setActiveIndex((index + availableImages.length) % availableImages.length);

  useEffect(() => {
    if (!multiple || paused || variant !== "card" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % availableImages.length), 4_000);
    return () => window.clearInterval(timer);
  }, [availableImages.length, multiple, paused, variant]);

  const endTouch = (clientX: number) => {
    if (touchStartX.current === null) return;
    const distance = clientX - touchStartX.current;
    if (Math.abs(distance) > 40) show(activeIndex + (distance > 0 ? -1 : 1));
    touchStartX.current = null;
    setPaused(true);
  };

  const activeImage = availableImages[activeIndex] ?? "/brand/eshak-logo.png";
  return <div
    className={`ink-carousel ink-carousel-${variant}`}
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)}
    onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; setPaused(true); }}
    onTouchEnd={(event) => endTouch(event.changedTouches[0]?.clientX ?? 0)}
    aria-roledescription="carousel"
    aria-label={`صور ${alt}`}
  >
    <Image
      key={activeImage}
      src={activeImage}
      alt={`${alt} — صورة ${activeIndex + 1}`}
      width={variant === "quick" ? 700 : 560}
      height={variant === "quick" ? 600 : 440}
      sizes={variant === "quick" ? "(max-width: 760px) 90vw, 405px" : "(max-width: 760px) 88vw, (max-width: 1000px) 44vw, 360px"}
      loading={activeIndex === 0 ? "eager" : "lazy"}
    />
    {multiple && <>
      <button type="button" className="ink-carousel-arrow previous" onClick={() => { show(activeIndex - 1); setPaused(true); }} aria-label="الصورة السابقة">‹</button>
      <button type="button" className="ink-carousel-arrow next" onClick={() => { show(activeIndex + 1); setPaused(true); }} aria-label="الصورة التالية">›</button>
      <div className="ink-carousel-dots" aria-label="اختيار صورة المنتج">{availableImages.map((image, index) => <button type="button" className={index === activeIndex ? "active" : ""} onClick={() => { show(index); setPaused(true); }} aria-label={`عرض الصورة ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} key={image} />)}</div>
    </>}
  </div>;
}
