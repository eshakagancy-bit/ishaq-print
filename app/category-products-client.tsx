"use client";

import Image from "./storefront-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildInkSpecificationRows } from "./ink-specifications";
import InkImageCarousel from "./ink-image-carousel";
import { buildPaperSpecificationRows, getPaperAvailabilityLabel } from "./paper-specifications";
import { buildQuickViewSpecificationRows } from "./printer-specifications";
import type { PublicEnabledCategory } from "./public-categories";
import type { SiteSettings, StoredProduct } from "./site-defaults";
import { getInkSlug } from "./inks/product-slug";
import { getPaperSlug } from "./papers/product-slug";
import { getPrinterSlug } from "./printers/product-slug";
import QuickViewModal from "./quick-view-modal";
import { productPriceLabel } from "./product-commerce";
import StorefrontFooter from "./storefront-footer";
import PublicSearchControl from "./global-search-drawer";
import { CartDrawerOverlay, CartHeaderButton } from "./order-cart-ui";
import ProductCardCartButton from "./product-card-cart-button";
import PublicTopBar from "./public-topbar";
import ProductModelChips from "./product-model-chips";

const FAVORITES_STORAGE_KEY = "eshak-favorite-products";
const categoryLabels: Record<PublicEnabledCategory, string> = { printers: "جميع الطابعات", inks: "جميع الأحبار", papers: "جميع الأوراق" };

function productSlug(product: StoredProduct) {
  if (product.category === "inks") return getInkSlug(product);
  if (product.category === "papers") return getPaperSlug(product);
  return getPrinterSlug(product);
}

function displayName(product: StoredProduct) {
  return product.category === "papers" ? product.paperSpecifications?.nameEn?.trim() || product.name : product.name;
}

function whatsappLink(product: StoredProduct) {
  return `https://wa.me/967778989866?text=${encodeURIComponent(`مرحبًا مجموعة إسحاق العالمية، أريد معرفة السعر والتوفر للمنتج: ${product.name}.`)}`;
}

function filterProductsByCurrentFields(products: StoredProduct[], normalizedQuery: string) {
  return products.filter((product) => `${product.name} ${product.family} ${product.description}`.toLocaleLowerCase("ar").includes(normalizedQuery));
}

export default function CategoryProductsClient({ category, products, allProducts, settings }: { category: PublicEnabledCategory; products: StoredProduct[]; allProducts: StoredProduct[]; settings: SiteSettings }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selected, setSelected] = useState<StoredProduct | null>(null);
  const [quickViewTrigger, setQuickViewTrigger] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let storedFavorites: number[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) storedFavorites = stored.map(Number).filter(Number.isSafeInteger);
    } catch { localStorage.removeItem(FAVORITES_STORAGE_KEY); }
    const hydrationTimer = window.setTimeout(() => setFavorites(storedFavorites), 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  const toggleFavorite = (id: number) => setFavorites((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
    return next;
  });
  const openQuickView = (product: StoredProduct, trigger: HTMLElement | null = null) => {
    setQuickViewTrigger(trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null));
    setSelected(product);
  };
  const closeQuickView = useCallback(() => setSelected(null), []);
  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ar");
    if (!normalizedQuery) return products;
    const productMatches = filterProductsByCurrentFields(products, normalizedQuery);
    const modelMatches = products.filter((product) => (product.models ?? []).filter((model) => model.isActive).flatMap((model) => [model.model, model.partNumber, model.compatibility]).filter(Boolean).join(" ").toLocaleLowerCase("ar").includes(normalizedQuery));
    return [...new Map([...productMatches, ...modelMatches].map((product) => [product.id, product])).values()];
  }, [products, query]);
  const selectedRows = selected
    ? selected.category === "inks" ? buildInkSpecificationRows(selected) : selected.category === "papers" ? buildPaperSpecificationRows(selected) : buildQuickViewSpecificationRows(selected)
    : [];

  return <main id="main-content" tabIndex={-1} className="category-products-page" data-category={category} dir="rtl">
    <PublicTopBar settings={settings}/>
    <header className="category-products-header"><div className="container"><Link className="collection-brand" href="/" aria-label="وكالة إسحاق العالمية"><Image src="/brand/eshak-logo.png" alt="وكالة إسحاق العالمية" width={160} height={70} sizes="160px" loading="eager" fetchPriority="low" /></Link><nav aria-label="التنقل الرئيسي"><Link href="/">الرئيسية</Link><Link href="/categories">الفئات</Link><Link href="/printers">الطابعات</Link><Link href="/inks">الأحبار</Link><Link href="/papers">الأوراق</Link></nav><div className="collection-header-actions"><CartHeaderButton compact/><PublicSearchControl products={allProducts}/><Link href="/?favorites=1" aria-label={`المفضلة، ${favorites.length} منتجات`}>المفضلة <b>{favorites.length}</b></Link></div></div></header>
    <section className="container category-products-content">
      <nav className="collection-breadcrumb" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><b>{categoryLabels[category]}</b></nav>
      <div className="category-products-title"><div><span>مجموعة المنتجات</span><h1>{categoryLabels[category]}</h1></div></div>
      <label className="category-products-search"><span>ابحث داخل القسم</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ابحث داخل ${categoryLabels[category]}...`} /></label>
      {visibleProducts.length ? <div className="category-products-list">{visibleProducts.map((product) => {
        const images = product.images?.length ? product.images : [product.image];
        const detailsHref = `/${category}/${productSlug(product)}`;
        return <article className="category-product-row" key={product.id} role="link" tabIndex={0} aria-label={`فتح تفاصيل ${displayName(product)}`} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) router.push(detailsHref); }} onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === "Enter") router.push(detailsHref); }}>
          <div className="category-product-image">{category !== "printers" && product.badge?.trim() && <span className="product-badge">{product.badge}</span>}<ProductCardCartButton category={category} productId={String(product.id)} productName={displayName(product)} productUrl={detailsHref} image={product.image || "/brand/eshak-logo.png"} inkVariantCount={product.inkSpecifications?.variants.length}/><button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorites.includes(product.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg></button>{product.category === "inks" ? <InkImageCarousel images={images} alt={displayName(product)} /> : <Link className="product-image-link" href={detailsHref}><Image src={product.image || "/brand/eshak-logo.png"} alt={displayName(product)} width={420} height={320} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 30vw, 280px" /></Link>}<button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)} aria-label={`تفاصيل سريعة لـ ${displayName(product)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg><span>تفاصيل سريعة</span></button></div>
          <div className="category-product-content">{product.family && <span className="product-family">{product.family}</span>}<h2><Link href={detailsHref}>{displayName(product)}</Link></h2>{category === "papers" && getPaperAvailabilityLabel(product) && <span className="product-availability" data-availability>{getPaperAvailabilityLabel(product)}</span>}<ProductModelChips product={product} detailsHref={detailsHref} /><div className="category-product-price"><small>السعر</small><strong>{productPriceLabel(product.price)}</strong></div><div className="category-product-actions"><Link href={detailsHref}>لمعرفة المزيد</Link></div></div>
        </article>;
      })}</div> : <div className="empty-state"><b>{query.trim() ? "لا توجد نتائج مطابقة" : `لا توجد منتجات في ${categoryLabels[category]} حاليًا`}</b><p>{query.trim() ? "جرّب البحث باسم آخر." : "يمكنك العودة لاحقًا أو التواصل معنا لمعرفة المتوفر."}</p></div>}
    </section>
    <StorefrontFooter settings={settings} />
    <CartDrawerOverlay/>
    {selected && <QuickViewModal id={selected.id} title={displayName(selected)} categoryLabel={categoryLabels[category]} family={selected.family} badge={selected.badge} availabilityLabel={category === "papers" ? getPaperAvailabilityLabel(selected) : null} description={selected.description} price={selected.price} images={selected.images?.length ? selected.images : selected.paperSpecifications?.images?.length ? selected.paperSpecifications.images : selected.inkSpecifications?.images?.length ? selected.inkSpecifications.images : [selected.image]} rows={selectedRows} detailsHref={`/${category}/${productSlug(selected)}`} models={selected.models} whatsappHref={whatsappLink(selected)} whatsappLabel="اعرف السعر والتوفر" trigger={quickViewTrigger} onClose={closeQuickView} />}
  </main>;
}
