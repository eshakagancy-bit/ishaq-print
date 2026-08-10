"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { buildInkSpecificationRows } from "./ink-specifications";
import InkImageCarousel from "./ink-image-carousel";
import { buildPaperSpecificationRows } from "./paper-specifications";
import {
  ALL_PRINTERS_FILTER,
  PRINTER_CATEGORIES,
  resolvePrinterCategory,
  type PrinterCategoryFilter,
} from "./printer-categories";
import { buildQuickViewSpecificationRows } from "./printer-specifications";
import type { PublicEnabledCategory } from "./public-categories";
import type { StoredProduct } from "./site-defaults";
import { getInkSlug } from "./inks/product-slug";
import { getPaperSlug } from "./papers/product-slug";
import { getPrinterSlug } from "./printers/product-slug";
import QuickViewModal from "./quick-view-modal";

const FAVORITES_STORAGE_KEY = "eshak-favorite-products";
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

export default function CategoryProductsClient({ category, products }: { category: PublicEnabledCategory; products: StoredProduct[] }) {
  const [query, setQuery] = useState("");
  const [printerFilter, setPrinterFilter] = useState<PrinterCategoryFilter>(ALL_PRINTERS_FILTER.value);
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
  const visibleProducts = products.filter((product) => {
    const matchesPrinterFilter = category !== "printers"
      || printerFilter === ALL_PRINTERS_FILTER.value
      || resolvePrinterCategory(product.printerCategory, product.name) === printerFilter;
    return matchesPrinterFilter && `${product.name} ${product.family} ${product.description}`.toLowerCase().includes(query.toLowerCase());
  });
  const selectedRows = selected
    ? selected.category === "inks" ? buildInkSpecificationRows(selected) : selected.category === "papers" ? buildPaperSpecificationRows(selected) : buildQuickViewSpecificationRows(selected)
    : [];

  return <main className="category-products-page" data-category={category} dir="rtl">
    <header className="category-products-header"><div className="container"><Link href="/">العودة إلى الرئيسية</Link><Image src="/brand/eshak-logo.png" alt="مجموعة إسحاق العالمية" width={160} height={70} priority /></div></header>
    <section className="container category-products-content">
      <div className="category-products-title"><span>منتجات القسم</span><h1>{categoryLabels[category]}</h1></div>
      {category === "printers" && <div className="printer-category-filters" role="group" aria-label="تصنيف الطابعات">{[ALL_PRINTERS_FILTER, ...PRINTER_CATEGORIES].map((item) => {
        const count = item.value === ALL_PRINTERS_FILTER.value
          ? products.length
          : products.filter((product) => resolvePrinterCategory(product.printerCategory, product.name) === item.value).length;
        return <button type="button" className={printerFilter === item.value ? "active" : ""} aria-pressed={printerFilter === item.value} onClick={() => setPrinterFilter(item.value)} key={item.value}><span>{printerFilterLabels[item.value]}</span><small>{count}</small></button>;
      })}</div>}
      <label className="category-products-search"><span>بحث</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ابحث داخل ${categoryLabels[category]}...`} /></label>
      {visibleProducts.length ? <div className="category-products-list">{visibleProducts.map((product) => {
        const slug = productSlug(product);
        const images = product.images?.length ? product.images : [product.image];
        return <article className="category-product-row" key={product.id}>
          <div className="category-product-image"><button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}>♥</button>{product.category === "inks" ? <InkImageCarousel images={images} alt={displayName(product)} /> : <Link href={`/${category}/${slug}`}><Image src={product.image || "/brand/eshak-logo.png"} alt={displayName(product)} width={420} height={320} sizes="(max-width: 700px) 92vw, 280px" /></Link>}</div>
          <div className="category-product-content">{product.family && <span className="product-family">{product.family}</span>}<Link href={`/${category}/${slug}`}><h2>{displayName(product)}</h2></Link>{product.description && <p>{product.description}</p>}<button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)}>تفاصيل سريعة</button><div className="category-product-actions"><Link href={`/${category}/${slug}`}>فتح صفحة التفاصيل</Link><a href={whatsappLink(product)} target="_blank" rel="noreferrer">اطلب من المختص</a></div></div>
        </article>;
      })}</div> : <div className="empty-state"><b>{query ? "لا توجد نتائج مطابقة" : category === "printers" && printerFilter !== ALL_PRINTERS_FILTER.value ? "لا توجد طابعات في هذا التصنيف حاليًا" : `لا توجد منتجات في ${categoryLabels[category]} حاليًا`}</b><p>{query ? "جرّب البحث باسم آخر." : "يمكنك العودة لاحقًا أو التواصل معنا لمعرفة المتوفر."}</p></div>}
    </section>
    {selected && <QuickViewModal id={selected.id} title={displayName(selected)} categoryLabel={categoryLabels[category]} family={selected.family} badge={selected.badge} description={selected.description} price={selected.price} images={selected.images?.length ? selected.images : selected.paperSpecifications?.images?.length ? selected.paperSpecifications.images : selected.inkSpecifications?.images?.length ? selected.inkSpecifications.images : [selected.image]} rows={selectedRows} detailsHref={`/${category}/${productSlug(selected)}`} whatsappHref={whatsappLink(selected)} whatsappLabel="اطلب من المختص" trigger={quickViewTrigger} onClose={closeQuickView} />}
  </main>;
}
