"use client";

import Image from "./storefront-image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { searchProducts, type ProductSearchScope } from "./global-product-search";
import { getInkSlug } from "./inks/product-slug";
import { getPaperSlug } from "./papers/product-slug";
import { getPrinterSlug } from "./printers/product-slug";
import type { StoredProduct } from "./site-defaults";
import { announceHeaderDrawer, HEADER_DRAWER_EVENT, type HeaderDrawerName } from "./order-cart-provider";

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
}

function productDetailsHref(product: StoredProduct) {
  if (product.category === "inks") return `/inks/${getInkSlug(product)}`;
  if (product.category === "papers") return `/papers/${getPaperSlug(product)}`;
  return `/printers/${getPrinterSlug(product)}`;
}

function productDisplayName(product: StoredProduct) {
  return product.category === "papers" ? product.paperSpecifications?.nameEn?.trim() || product.name : product.name;
}

function productCategoryLine(product: StoredProduct) {
  if (product.category === "inks") return "الأحبار";
  if (product.category === "papers") return "الأوراق";
  return "الطابعات";
}

type GlobalSearchDrawerProps = {
  open: boolean;
  onClose: () => void;
  products: StoredProduct[];
  triggerRef: RefObject<HTMLElement | null>;
};

export function GlobalSearchDrawer({ open, onClose, products, triggerRef }: GlobalSearchDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<ProductSearchScope>("all");
  const panelRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim();
  const matchingProducts = useMemo(() => searchProducts(products, searchQuery, searchScope, (product) => [
    product.name,
    productDisplayName(product),
    product.family,
    product.type,
    product.description,
    product.printerCategory,
    product.inkSpecifications?.inkType,
    product.paperSpecifications?.paperType,
  ]), [products, searchQuery, searchScope]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > *")].filter((element) => !element.contains(panel));
    const backgroundState = backgroundElements.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => element.tabIndex >= 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = bodyOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.requestAnimationFrame(() => {
        if (!document.querySelector('[role="dialog"][aria-modal="true"]')) trigger?.focus();
      });
    };
  }, [onClose, open, triggerRef]);

  return <aside ref={panelRef} id="search-drawer" className="search-drawer" role="dialog" aria-modal={open ? "true" : undefined} aria-hidden={!open} inert={!open} aria-labelledby="search-drawer-title">
    <div className="search-drawer-header"><button type="button" className="drawer-close" onClick={onClose} aria-label="إغلاق البحث"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2 id="search-drawer-title">ابحث في موقعنا</h2></div>
    <div className="search-drawer-controls">
      <label className="search-scope-field" htmlFor="global-search-scope"><span>نطاق البحث</span><select id="global-search-scope" value={searchScope} onChange={(event) => setSearchScope(event.target.value as ProductSearchScope)}><option value="all">جميع الفئات</option><option value="printers">الطابعات</option><option value="inks">الأحبار</option><option value="papers">الأوراق</option></select></label>
      <label className="global-search-field" htmlFor="global-search-input"><span className="sr-only">البحث عن منتج</span><input ref={inputRef} id="global-search-input" type="search" dir="auto" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث عن منتج..." autoComplete="off"/><SearchIcon/>{searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="مسح البحث"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>}</label>
    </div>
    <div className="search-drawer-results" aria-live="polite">
      {!normalizedSearchQuery ? <div className="search-drawer-state"><SearchIcon/><p>ابدأ بالبحث عن منتج</p><span>ابحث بالاسم أو الموديل أو النوع.</span></div> : matchingProducts.length ? <><p className="search-result-count">{matchingProducts.length} {matchingProducts.length === 1 ? "نتيجة" : "نتائج"}</p><div className="search-results-list">{matchingProducts.map((product) => <Link key={`${product.category}-${product.id}`} href={productDetailsHref(product)} className="search-result-item" onClick={onClose}><span className="search-result-image"><Image src={product.image || "/brand/eshak-logo.png"} alt="" width={88} height={88} sizes="72px" draggable={false}/></span><span className="search-result-copy"><strong dir="auto">{productDisplayName(product)}</strong><small dir="auto">{productCategoryLine(product)}</small></span><svg className="search-result-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></Link>)}</div></> : <div className="search-drawer-state no-results" role="status"><h3>لا توجد نتائج مطابقة</h3><p>جرّب كلمة بحث أخرى أو اختر فئة مختلفة.</p></div>}
    </div>
  </aside>;
}

export default function PublicSearchControl({ products, variant = "text" }: { products: StoredProduct[]; variant?: "text" | "icon" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const closeForAnotherDrawer = (event: Event) => {
      if ((event as CustomEvent<HeaderDrawerName>).detail !== "search") setOpen(false);
    };
    window.addEventListener(HEADER_DRAWER_EVENT, closeForAnotherDrawer);
    return () => window.removeEventListener(HEADER_DRAWER_EVENT, closeForAnotherDrawer);
  }, []);
  const openSearch = () => { announceHeaderDrawer("search"); setOpen(true); };
  return <><button ref={triggerRef} type="button" className={variant === "icon" ? "header-search-button" : "public-search-button"} onClick={openSearch} aria-label="فتح البحث" aria-controls="search-drawer" aria-expanded={open} aria-haspopup="dialog">{variant === "icon" ? <SearchIcon/> : "بحث"}</button><div className={open ? "menu-overlay open search-open" : "menu-overlay"} aria-hidden={!open} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><GlobalSearchDrawer open={open} onClose={close} products={products} triggerRef={triggerRef}/></div></>;
}
