"use client";

import Image from "./storefront-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildInkSpecificationRows } from "./ink-specifications";
import InkImageCarousel from "./ink-image-carousel";
import { buildPaperSpecificationRows, getPaperAvailabilityLabel } from "./paper-specifications";
import {
  ALL_PRINTERS_FILTER,
  PRINTER_CATEGORIES,
  resolvePrinterCategory,
  type PrinterCategoryFilter,
} from "./printer-categories";
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

const FAVORITES_STORAGE_KEY = "eshak-favorite-products";
type SortMode = "default" | "name-asc" | "name-desc";
const productNameCollator = new Intl.Collator("ar", { numeric: true, sensitivity: "base" });
const categoryLabels: Record<PublicEnabledCategory, string> = { printers: "جميع الطابعات", inks: "جميع الأحبار", papers: "جميع الأوراق" };
const printerFilterLabels: Record<PrinterCategoryFilter, string> = {
  all: "الكل (جميع الطابعات)",
  workforce: "WorkForce (طابعات الأعمال الشاقة)",
  ecotank: "EcoTank (الطابعات المكتبية)",
  "ecotank-6-color": "EcoTank 6 Color (طابعات التصوير الفوتوغرافي)",
  lq: "LQ (طابعات المستندات والفواتير)",
};

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

export default function CategoryProductsClient({ category, products, allProducts, settings }: { category: PublicEnabledCategory; products: StoredProduct[]; allProducts: StoredProduct[]; settings: SiteSettings }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [printerFilter, setPrinterFilter] = useState<PrinterCategoryFilter>(ALL_PRINTERS_FILTER.value);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selected, setSelected] = useState<StoredProduct | null>(null);
  const [quickViewTrigger, setQuickViewTrigger] = useState<HTMLElement | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesPrinterFilter = category !== "printers"
      || printerFilter === ALL_PRINTERS_FILTER.value
      || resolvePrinterCategory(product.printerCategory, product.name) === printerFilter;
    return matchesPrinterFilter && `${product.name} ${product.family} ${product.description}`.toLowerCase().includes(query.toLowerCase());
  }), [category, printerFilter, products, query]);
  const sortedProducts = useMemo(() => {
    if (sortMode === "default") return visibleProducts;
    return [...visibleProducts].sort((first, second) => {
      const result = productNameCollator.compare(displayName(first), displayName(second));
      return sortMode === "name-asc" ? result : -result;
    });
  }, [sortMode, visibleProducts]);
  const trimmedQuery = query.trim();
  const hasActivePrinterFilter = category === "printers" && printerFilter !== ALL_PRINTERS_FILTER.value;
  const filteredSearchHasNoResults = Boolean(trimmedQuery) && hasActivePrinterFilter && visibleProducts.length === 0;
  const clearPrinterFilters = () => setPrinterFilter(ALL_PRINTERS_FILTER.value);
  const showAllProducts = () => {
    setPrinterFilter(ALL_PRINTERS_FILTER.value);
    setQuery("");
  };
  useEffect(() => {
    if (!filtersOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [filtersOpen]);
  const selectedRows = selected
    ? selected.category === "inks" ? buildInkSpecificationRows(selected) : selected.category === "papers" ? buildPaperSpecificationRows(selected) : buildQuickViewSpecificationRows(selected)
    : [];

  return <main id="main-content" tabIndex={-1} className="category-products-page" data-category={category} dir="rtl">
    <header className="category-products-header"><div className="container"><Link className="collection-brand" href="/" aria-label="وكالة إسحاق العالمية"><Image src="/brand/eshak-logo.png" alt="وكالة إسحاق العالمية" width={160} height={70} sizes="160px" loading="eager" fetchPriority="low" /></Link><nav aria-label="التنقل الرئيسي"><Link href="/">الرئيسية</Link><Link href="/categories">الفئات</Link><Link href="/printers">الطابعات</Link><Link href="/inks">الأحبار</Link><Link href="/papers">الأوراق</Link></nav><div className="collection-header-actions"><CartHeaderButton compact/><PublicSearchControl products={allProducts}/><Link href="/?favorites=1" aria-label={`المفضلة، ${favorites.length} منتجات`}>المفضلة <b>{favorites.length}</b></Link></div></div></header>
    <section className="container category-products-content">
      <nav className="collection-breadcrumb" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><b>{categoryLabels[category]}</b></nav>
      <div className="category-products-title"><div><span>مجموعة المنتجات</span><h1>{categoryLabels[category]}</h1></div><p>{products.length} {products.length === 1 ? "منتج" : "منتجات"}</p></div>
      <label className="category-products-search"><span>ابحث داخل القسم</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ابحث داخل ${categoryLabels[category]}...`} /></label>
      <div className="collection-toolbar"><div><button type="button" className="filter-toggle" aria-expanded={filtersOpen} aria-controls="collection-filters" onClick={() => setFiltersOpen(true)}>فلترة <span aria-hidden="true">☷</span></button><span className="collection-result-count">{sortedProducts.length} نتيجة</span></div><label className="collection-sort"><span>ترتيب حسب</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="default">الافتراضي</option><option value="name-asc">الاسم A–Z</option><option value="name-desc">الاسم Z–A</option></select></label></div>
      {category === "printers" && <><div className={filtersOpen ? "collection-filter-backdrop open" : "collection-filter-backdrop"} onMouseDown={() => setFiltersOpen(false)}></div><div id="collection-filters" className={filtersOpen ? "printer-category-filters open" : "printer-category-filters"} role="group" aria-label="تصنيف الطابعات"><div className="filter-drawer-heading"><b>فلترة الطابعات</b><button type="button" onClick={() => setFiltersOpen(false)} aria-label="إغلاق الفلاتر">×</button></div>{[ALL_PRINTERS_FILTER, ...PRINTER_CATEGORIES].map((item) => {
        const count = item.value === ALL_PRINTERS_FILTER.value
          ? products.length
          : products.filter((product) => resolvePrinterCategory(product.printerCategory, product.name) === item.value).length;
        return <button type="button" className={printerFilter === item.value ? "active" : ""} aria-pressed={printerFilter === item.value} onClick={() => { setPrinterFilter(item.value); setFiltersOpen(false); }} key={item.value}><span>{printerFilterLabels[item.value]}</span><small>{count}</small></button>;
      })}{hasActivePrinterFilter && <button type="button" className="clear-active-filter" onClick={clearPrinterFilters}>مسح الفلاتر</button>}</div></>}
      {sortedProducts.length ? <div className="category-products-list">{sortedProducts.map((product) => {
        const images = product.images?.length ? product.images : [product.image];
        const detailsHref = `/${category}/${productSlug(product)}`;
        return <article className="category-product-row" key={product.id} role="link" tabIndex={0} aria-label={`فتح تفاصيل ${displayName(product)}`} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) router.push(detailsHref); }} onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === "Enter") router.push(detailsHref); }}>
          <div className="category-product-image">{product.badge?.trim() && <span className="product-badge">{product.badge}</span>}<button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorites.includes(product.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg></button>{product.category === "inks" ? <InkImageCarousel images={images} alt={displayName(product)} /> : <Link className="product-image-link" href={detailsHref}><Image src={product.image || "/brand/eshak-logo.png"} alt={displayName(product)} width={420} height={320} sizes="(max-width: 700px) 46vw, (max-width: 1100px) 30vw, 280px" /></Link>}<button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)} aria-label={`تفاصيل سريعة لـ ${displayName(product)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg><span>تفاصيل سريعة</span></button></div>
          <div className="category-product-content">{product.family && <span className="product-family">{product.family}</span>}<h2><Link href={detailsHref}>{displayName(product)}</Link></h2>{category === "papers" && getPaperAvailabilityLabel(product) && <span className="product-availability" data-availability>{getPaperAvailabilityLabel(product)}</span>}<div className="category-product-price"><small>السعر</small><strong>{productPriceLabel(product.price)}</strong></div><div className="category-product-actions"><a href={whatsappLink(product)} target="_blank" rel="noreferrer">اعرف السعر والتوفر</a></div></div>
        </article>;
      })}</div> : filteredSearchHasNoResults ? <div className="empty-state"><b>{`لا توجد نتائج لـ «${trimmedQuery}» ضمن فلتر ${printerFilterLabels[printerFilter]}.`}</b><p>قد يكون الفلتر الحالي سبب عدم ظهور المنتج الذي تبحث عنه.</p><div className="empty-actions"><button type="button" onClick={clearPrinterFilters}>مسح الفلاتر</button><button type="button" className="outline-button" onClick={showAllProducts}>عرض كل المنتجات</button></div></div> : <div className="empty-state"><b>{query ? "لا توجد نتائج مطابقة" : category === "printers" && printerFilter !== ALL_PRINTERS_FILTER.value ? "لا توجد طابعات في هذا التصنيف حاليًا" : `لا توجد منتجات في ${categoryLabels[category]} حاليًا`}</b><p>{query ? "جرّب البحث باسم آخر." : "يمكنك العودة لاحقًا أو التواصل معنا لمعرفة المتوفر."}</p></div>}
    </section>
    <StorefrontFooter settings={settings} />
    <CartDrawerOverlay/>
    {selected && <QuickViewModal id={selected.id} title={displayName(selected)} categoryLabel={categoryLabels[category]} family={selected.family} badge={selected.badge} availabilityLabel={category === "papers" ? getPaperAvailabilityLabel(selected) : null} description={selected.description} price={selected.price} images={selected.images?.length ? selected.images : selected.paperSpecifications?.images?.length ? selected.paperSpecifications.images : selected.inkSpecifications?.images?.length ? selected.inkSpecifications.images : [selected.image]} rows={selectedRows} detailsHref={`/${category}/${productSlug(selected)}`} whatsappHref={whatsappLink(selected)} whatsappLabel="اعرف السعر والتوفر" trigger={quickViewTrigger} onClose={closeQuickView} />}
  </main>;
}
