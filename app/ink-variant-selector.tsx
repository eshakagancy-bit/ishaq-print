"use client";

import Image from "./storefront-image";
import { useState } from "react";
import type { InkVariant } from "./ink-specifications";
import { INK_FULL_SET_VARIANT_CODE, INK_FULL_SET_VARIANT_LABEL } from "./order-cart";
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
  const fallbackImage = fallbackImages.find(Boolean) ?? "/brand/eshak-logo.png";
  const fullSetOption: InkVariant = { code: INK_FULL_SET_VARIANT_CODE, label: INK_FULL_SET_VARIANT_LABEL, image: fallbackImage };
  const options = [fullSetOption, ...variants];
  const selected = options.find((option) => option.code === selectedCode) ?? options[0];

  return <div className="printer-gallery product-gallery ink-variant-selector">
    <div className="product-gallery-main static"><Image key={selected.image} src={selected.image} alt={`${productName} — ${selected.label} (${selected.code})`} width={760} height={620} sizes="(max-width: 800px) 92vw, 48vw" priority /></div>
    <div className="ink-variant-active" aria-live="polite"><span>الخيار المحدد</span><strong>{selected.label} <b dir="ltr">({selected.code})</b></strong></div>
    <div className="ink-variant-options" role="group" aria-label="اختر خيار الحبر">{options.map((option) => <button type="button" className={option.code === selected.code ? "active" : ""} aria-pressed={option.code === selected.code} onClick={() => setSelectedCode(option.code)} key={option.code}><Image src={option.image} alt="" width={86} height={86} sizes="64px" /><span>{option.label}</span><b dir="ltr">{option.code}</b></button>)}</div>
    <AddToCartButton item={{ productType: "ink", productId, productName, productUrl, image: selected.image, variant: { code: selected.code, label: selected.label } }} />
  </div>;
}
