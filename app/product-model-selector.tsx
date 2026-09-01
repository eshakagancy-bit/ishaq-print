"use client";

import Image from "./storefront-image";
import { useState } from "react";
import { PRODUCT_MODEL_AVAILABILITY_LABELS, selectProductModel } from "./product-models";
import { productPriceLabel } from "./product-commerce";
import type { ProductModel } from "./site-defaults";

export default function ProductModelSelector({ models, requestedModel, productImage, productName }: { models: ProductModel[]; requestedModel?: string; productImage: string; productName: string }) {
  const activeModels = models.filter((model) => model.isActive).toSorted((a, b) => a.sortOrder - b.sortOrder);
  const initialModel = selectProductModel(activeModels, requestedModel);
  const [selectedId, setSelectedId] = useState(initialModel?.id ?? initialModel?.model);
  if (!initialModel) return null;
  const selected = activeModels.find((model) => (model.id ?? model.model) === selectedId) ?? initialModel;
  const selectedImage = selected.image || productImage || "/brand/eshak-logo.png";
  const rows = [
    ["الموديل", selected.model],
    ["رقم القطعة", selected.partNumber],
    ["اللون", selected.color],
    ["التوافق", selected.compatibility],
    ["التوفر", PRODUCT_MODEL_AVAILABILITY_LABELS[selected.availability]],
    ["السعر", selected.price ? productPriceLabel(selected.price) : undefined],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return <section className="product-model-selector" aria-labelledby="product-model-selector-title">
    <div className="product-model-image"><Image src={selectedImage} alt={`${productName} - ${selected.model}`} width={760} height={620} sizes="(max-width: 760px) calc(100vw - 40px), 48vw" /></div>
    <div className="product-model-picker">
      <h2 id="product-model-selector-title">اختر الموديل</h2>
      <div className="product-model-options" role="group" aria-label="اختيار موديل المنتج">
        {activeModels.map((model) => <button key={model.id ?? model.model} type="button" dir="ltr" className={(model.id ?? model.model) === (selected.id ?? selected.model) ? "active" : ""} aria-pressed={(model.id ?? model.model) === (selected.id ?? selected.model)} onClick={() => setSelectedId(model.id ?? model.model)}>{model.model}</button>)}
      </div>
      <dl className="product-model-info">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>
    </div>
  </section>;
}
