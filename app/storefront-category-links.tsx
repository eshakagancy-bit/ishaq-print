import Link from "next/link";
import { PUBLIC_CATEGORY_DETAILS, type PublicEnabledCategory } from "./public-categories";
import Image from "./storefront-image";

export const STOREFRONT_CATEGORY_ORDER: PublicEnabledCategory[] = ["printers", "inks", "papers"];

export const STOREFRONT_CATEGORY_ARTWORK: Record<PublicEnabledCategory, string> = {
  printers: "/categories/printers-unified.png",
  inks: "/categories/inks-unified.png",
  papers: "/categories/papers-unified.png",
};

export default function StorefrontCategoryLinks() {
  return <div className="storefront-category-grid">{STOREFRONT_CATEGORY_ORDER.map((categoryId) =>
    <Link className="storefront-category-card" data-category={categoryId} href={PUBLIC_CATEGORY_DETAILS[categoryId].href} key={categoryId}>
      <div className="storefront-category-image"><Image src={STOREFRONT_CATEGORY_ARTWORK[categoryId]} alt={PUBLIC_CATEGORY_DETAILS[categoryId].label} width={1254} height={1254} sizes="(max-width: 760px) 28vw, (max-width: 1100px) clamp(190px, 21vw, 230px), clamp(220px, 23vw, 320px)" /></div>
      <h3>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h3>
    </Link>
  )}</div>;
}
