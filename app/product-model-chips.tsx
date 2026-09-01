import Link from "next/link";
import { activeProductModels, productModelHref } from "./product-models";
import type { StoredProduct } from "./site-defaults";

export default function ProductModelChips({ product, detailsHref, limit = 4 }: { product: StoredProduct; detailsHref: string; limit?: number }) {
  const models = activeProductModels(product);
  if (!models.length) return null;
  const visibleModels = models.slice(0, limit);
  return <div className="product-model-chips" aria-label="الموديلات المتوفرة">
    {visibleModels.map((model) => <Link key={model.id ?? model.model} href={productModelHref(detailsHref, model)} dir="ltr" aria-label={`عرض الموديل ${model.model}`}>{model.model}</Link>)}
    {models.length > limit ? <span aria-label={`${models.length - limit} موديلات إضافية`}>+{models.length - limit}</span> : null}
  </div>;
}
