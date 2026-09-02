"use client";

import { useMemo, useState } from "react";
import { activeModelVariants, laserInkColorLabel, selectModelVariant, type LaserInkColorMode } from "./laser-inks";
import { PRODUCT_MODEL_AVAILABILITY_LABELS, selectProductModel } from "./product-models";
import { AddToCartButton } from "./order-cart-ui";
import Image from "./storefront-image";
import type { ProductModel } from "./site-defaults";

type Props = {
  productId: string;
  productName: string;
  productUrl: string;
  productImage: string;
  models: ProductModel[];
  colorMode: LaserInkColorMode;
  requestedModel?: string;
  requestedColor?: string;
};

export default function LaserInkModelSelector({ productId, productName, productUrl, productImage, models, colorMode, requestedModel, requestedColor }: Props) {
  const activeModels = useMemo(() => models.filter((model) => model.isActive).toSorted((a, b) => a.sortOrder - b.sortOrder || a.model.localeCompare(b.model)), [models]);
  const initialModel = selectProductModel(activeModels, requestedModel);
  const [selectedModelKey, setSelectedModelKey] = useState<string>(String(initialModel?.id ?? initialModel?.model ?? ""));
  const [selectedColor, setSelectedColor] = useState(requestedColor?.trim().toLocaleLowerCase() ?? "");
  const [quantity, setQuantity] = useState(1);
  if (!initialModel) return null;

  const selectedModel = activeModels.find((model) => String(model.id ?? model.model) === selectedModelKey) ?? initialModel;
  const variants = activeModelVariants(selectedModel);
  const selectedVariant = colorMode === "color" ? selectModelVariant(variants, selectedColor || requestedColor) : undefined;
  const colorCode = colorMode === "black" ? "black" : selectedVariant?.color ?? "";
  const colorLabel = colorMode === "black" ? "أسود" : selectedVariant ? laserInkColorLabel(selectedVariant.color) : "";
  const partNumber = colorMode === "black" ? selectedModel.partNumber : selectedVariant?.partNumber;
  const availability = colorMode === "black" ? selectedModel.availability : selectedVariant?.availability;
  const selectedImage = selectedVariant?.image || selectedModel.image || productImage || "/brand/eshak-logo.png";
  const unavailable = !availability || availability === "out_of_stock";
  const selectedUrl = `${productUrl}?model=${encodeURIComponent(selectedModel.model)}${colorMode === "color" && colorCode ? `&color=${encodeURIComponent(colorCode)}` : ""}`;
  const rows = [
    ["الموديل", selectedModel.model],
    ["Part Number", partNumber],
    ["اللون", colorLabel],
    ["التوفر", availability ? PRODUCT_MODEL_AVAILABILITY_LABELS[availability] : undefined],
    ["التوافق", selectedModel.compatibility],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  const chooseModel = (model: ProductModel) => {
    setSelectedModelKey(String(model.id ?? model.model));
    const firstVariant = activeModelVariants(model)[0];
    setSelectedColor(firstVariant?.color ?? "");
    setQuantity(1);
  };

  return <section className="laser-ink-order-selector" aria-labelledby="laser-model-selector-title">
    <div className="product-model-image"><Image src={selectedImage} alt={`${productName} - ${selectedModel.model}${colorLabel ? ` - ${colorLabel}` : ""}`} width={760} height={620} sizes="(max-width: 760px) calc(100vw - 40px), 48vw" /></div>
    <div className="product-model-picker">
      <h2 id="laser-model-selector-title">اختر الموديل</h2>
      <div className="product-model-options laser-model-options" role="group" aria-label="اختيار موديل حبر الليزر">
        {activeModels.map((model) => <button key={model.id ?? model.model} type="button" dir="ltr" className={String(model.id ?? model.model) === String(selectedModel.id ?? selectedModel.model) ? "active" : ""} aria-pressed={String(model.id ?? model.model) === String(selectedModel.id ?? selectedModel.model)} onClick={() => chooseModel(model)}>{model.model}</button>)}
      </div>
      {colorMode === "color" && <div className="laser-color-picker"><h3>اختر اللون</h3><div className="laser-color-options" role="group" aria-label="اختيار لون حبر الليزر">{variants.map((variant) => {
        const active = variant.id ? variant.id === selectedVariant?.id : variant.color === selectedVariant?.color;
        return <button type="button" key={variant.id ?? variant.color} className={active ? "active" : ""} aria-pressed={active} onClick={() => { setSelectedColor(variant.color); setQuantity(1); }}><span className={`laser-color-dot ${variant.color}`} aria-hidden="true"/><b>{laserInkColorLabel(variant.color)}</b><small dir="ltr">{variant.partNumber}</small>{variant.availability === "out_of_stock" ? <em>غير متوفر</em> : null}</button>;
      })}</div></div>}
      <dl className="product-model-info">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>
      <div className="laser-order-actions">
        <div className="laser-quantity"><span>الكمية</span><div role="group" aria-label={`كمية ${selectedModel.model}`}><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={quantity === 1} aria-label="تقليل الكمية">−</button><b>{quantity}</b><button type="button" onClick={() => setQuantity((value) => Math.min(999, value + 1))} aria-label="زيادة الكمية">+</button></div></div>
        {unavailable ? <p className="laser-unavailable" role="status">هذا الخيار غير متوفر حاليًا ولا يمكن إضافته إلى السلة.</p> : null}
        <AddToCartButton disabled={unavailable} item={{ productType: "ink", productId, productName, productUrl: selectedUrl, image: selectedImage, quantity, model: { id: String(selectedModel.id ?? selectedModel.model), name: selectedModel.model, partNumber }, color: { id: selectedVariant?.id ? String(selectedVariant.id) : undefined, code: colorCode, label: colorLabel } }} />
      </div>
    </div>
  </section>;
}
