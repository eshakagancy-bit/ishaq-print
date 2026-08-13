"use client";

import { useEffect, useState } from "react";

const FAVORITES_STORAGE_KEY = "eshak-favorite-products";

export default function ProductFavoriteButton({ productId }: { productId: number }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let storedActive = false;
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as unknown;
      storedActive = Array.isArray(stored) && stored.map(Number).includes(productId);
    } catch {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    }
    const timer = window.setTimeout(() => setActive(storedActive), 0);
    return () => window.clearTimeout(timer);
  }, [productId]);

  const toggle = () => {
    setActive((current) => {
      let ids: number[] = [];
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as unknown;
        if (Array.isArray(stored)) ids = stored.map(Number).filter(Number.isSafeInteger);
      } catch {
        localStorage.removeItem(FAVORITES_STORAGE_KEY);
      }
      const next = current ? ids.filter((id) => id !== productId) : [...new Set([...ids, productId])];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      return !current;
    });
  };

  return <button type="button" className={active ? "product-detail-favorite active" : "product-detail-favorite"} onClick={toggle} aria-pressed={active} aria-label={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg>
    <span>{active ? "محفوظ في المفضلة" : "أضف إلى المفضلة"}</span>
  </button>;
}
