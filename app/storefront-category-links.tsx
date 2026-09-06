import Link from "next/link";
import { PUBLIC_CATEGORY_DETAILS, type PublicEnabledCategory } from "./public-categories";
import Image from "./storefront-image";
import { isLaserInkCategory } from "./laser-inks";

export const STOREFRONT_CATEGORY_ORDER: PublicEnabledCategory[] = ["printers", "papers", "inks", "laser_inks"];

export const STOREFRONT_CATEGORY_ARTWORK: Record<PublicEnabledCategory, string> = {
  printers: "/categories/printers-unified.png",
  inks: "/categories/inks-unified.png",
  papers: "/categories/papers-unified.png",
  laser_inks: "/categories/inks-unified.png",
};

type CategoryArtworkProduct = { category: string; image: string };

export default function StorefrontCategoryLinks({ products = [] }: { products?: CategoryArtworkProduct[] }) {
  const laserInkArtwork = products.find((product) => isLaserInkCategory(product.category) && product.image.trim())?.image;
  return <div className="storefront-category-grid">{STOREFRONT_CATEGORY_ORDER.map((categoryId) =>
    <Link className="storefront-category-card" data-category={categoryId} href={PUBLIC_CATEGORY_DETAILS[categoryId].href} key={categoryId}>
      <div className="storefront-category-image"><Image src={categoryId === "laser_inks" && laserInkArtwork ? laserInkArtwork : STOREFRONT_CATEGORY_ARTWORK[categoryId]} alt={PUBLIC_CATEGORY_DETAILS[categoryId].label} width={1254} height={1254} sizes="(max-width: 760px) 42vw, (max-width: 1100px) clamp(160px, 19vw, 210px), clamp(190px, 20vw, 270px)" /></div>
      <h3>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h3>
    </Link>
  )}</div>;
}
