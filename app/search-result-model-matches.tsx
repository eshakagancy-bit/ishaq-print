"use client";

import Link from "next/link";
import { productSearchMatchHref, type ProductModelSearchMatch } from "./global-product-search";
import { laserInkColorLabel } from "./laser-inks";

type SearchResultModelMatchesProps = {
  matches: ProductModelSearchMatch[];
  productHref: string;
  productName: string;
  query: string;
  onNavigate: () => void;
};

export default function SearchResultModelMatches({ matches, productHref, productName, query, onNavigate }: SearchResultModelMatchesProps) {
  if (!matches.length) return null;

  return <div className="search-result-model-context" role="group" aria-label="الموديلات المطابقة">
    <span className="search-result-model-heading">{matches.length === 1 ? "الموديل المطابق" : "الموديلات المطابقة"}</span>
    <div className="search-result-model-list">
      {matches.map((match) => {
        const compatibilityMatch = match.kinds.includes("compatibility");
        const modelPartMatch = match.kinds.includes("model-part-number");
        return <div className="search-result-model-match" key={match.model.id ?? match.model.model}>
          {match.variants.length ? match.variants.map((variant) => <Link
            className="search-result-model-chip"
            href={productSearchMatchHref(productHref, match.model, variant)}
            key={variant.id ?? `${match.model.model}-${variant.color}`}
            onClick={onNavigate}
            aria-label={`فتح ${productName} مع تحديد ${match.model.model}، ${laserInkColorLabel(variant.color)}، ${variant.partNumber}`}
          >
            <b dir="auto">{match.model.model}</b>
            <span>{laserInkColorLabel(variant.color)}</span>
            <small dir="ltr">{variant.partNumber}</small>
          </Link>) : <Link
            className="search-result-model-chip"
            href={productSearchMatchHref(productHref, match.model)}
            onClick={onNavigate}
            aria-label={`فتح ${productName} مع تحديد ${match.model.model}`}
          >
            <b dir="auto">{match.model.model}</b>
            {modelPartMatch && match.model.partNumber ? <small dir="ltr">{match.model.partNumber}</small> : null}
          </Link>}
          {compatibilityMatch ? <span className="search-result-compatibility"><b>متوافق مع بحثك: <span dir="ltr">{query.trim()}</span></b><small dir="auto">{match.model.compatibility}</small></span> : null}
        </div>;
      })}
    </div>
  </div>;
}
