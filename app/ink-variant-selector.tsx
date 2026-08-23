"use client";

import Image from "./storefront-image";
import { useState } from "react";
import type { InkVariant } from "./ink-specifications";
import { AddToCartButton } from "./order-cart-ui";

type InkVariantSelectorProps = {
  productId: string;
  productName: string;
  productUrl: string;
  variants: InkVariant[];
  fallbackImages: string[];
};

export default function InkVariantSelector({ productId, productName, productUrl, variants, fallbackImages }: InkVariantSelectorProps) {
  const [selectedCode, setSelectedCode] = useState(variants[0]?.code ?? "");
  const selected = variants.find((variant) => variant.code === selectedCode) ?? variants[0];
  const fallbackImage = fallbackImages.find(Boolean) ?? "/brand/eshak-logo.png";

  if (!selected) {
    return <div className="printer-gallery product-gallery ink-variant-unavailable"><div className="product-gallery-main static"><Image src={fallbackImage} alt={productName} width={760} height={620} sizes="(max-width: 800px) 92vw, 48vw" priority /></div></div>;
  }

  return <div className="printer-gallery product-gallery ink-variant-selector">
    <div className="product-gallery-main static"><Image key={selected.image} src={selected.image} alt={`${productName} — ${selected.label} (${selected.code})`} width={760} height={620} sizes="(max-width: 800px) 92vw, 48vw" priority /></div>
    <div className="ink-variant-active" aria-live="polite"><span>اللون المحدد</span><strong>{selected.label} <b dir="ltr">({selected.code})</b></strong></div>
    <div className="ink-variant-options" role="group" aria-label="اختر لون الحبر">{variants.map((variant) => <button type="button" className={variant.code === selected.code ? "active" : ""} aria-pressed={variant.code === selected.code} onClick={() => setSelectedCode(variant.code)} key={variant.code}><Image src={variant.image} alt="" width={86} height={86} sizes="64px" /><span>{variant.label}</span><b dir="ltr">{variant.code}</b></button>)}</div>
    <AddToCartButton item={{ productType: "ink", productId, productName, productUrl, image: selected.image, variant: { code: selected.code, label: selected.label } }} />
  </div>;
}
