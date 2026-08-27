"use client";

import Image from "./storefront-image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SITE_URL } from "./seo";
import { INK_FULL_SET_VARIANT_CODE, buildOrderWhatsAppUrl, type CartItemInput } from "./order-cart";
import { HEADER_DRAWER_EVENT, useOrderCart, type HeaderDrawerName } from "./order-cart-provider";

export function CartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>;
}

export function CartHeaderButton({ compact = false }: { compact?: boolean }) {
  const { hydrated, totalQuantity, drawerOpen, openCart } = useOrderCart();
  return <button type="button" className={compact ? "cart-header-button compact" : "cart-header-button"} onClick={openCart} aria-label={totalQuantity ? `فتح سلة الطلبات، إجمالي الكمية ${totalQuantity}` : "فتح سلة الطلبات"} aria-controls="order-cart-drawer" aria-expanded={drawerOpen} aria-haspopup="dialog"><CartIcon/>{hydrated && totalQuantity > 0 ? <b>{totalQuantity}</b> : null}</button>;
}

export function AddToCartButton({ item, className = "order-cart-add" }: { item: CartItemInput; className?: string }) {
  const { addItem } = useOrderCart();
  const [feedback, setFeedback] = useState("");
  const add = () => {
    addItem(item);
    setFeedback(item.variant ? `تمت إضافة ${item.variant.label} (${item.variant.code}) إلى سلة الطلبات` : "تمت الإضافة إلى سلة الطلبات");
  };
  return <div className="order-cart-add-wrap"><button type="button" className={className} onClick={add}><CartIcon/><span>أضف إلى سلة الطلبات</span></button><span className="order-cart-feedback" role="status" aria-live="polite">{feedback}</span></div>;
}

export function CartDrawerOverlay() {
  const { items, totalQuantity, drawerOpen, closeCart, increment, decrement, removeItem, clearCart } = useOrderCart();
  const panelRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const closeDrawer = useCallback(() => {
    setConfirmClear(false);
    closeCart();
  }, [closeCart]);

  useEffect(() => {
    const resetConfirmation = (event: Event) => {
      if ((event as CustomEvent<HeaderDrawerName>).detail !== "cart") setConfirmClear(false);
    };
    window.addEventListener(HEADER_DRAWER_EVENT, resetConfirmation);
    return () => window.removeEventListener(HEADER_DRAWER_EVENT, resetConfirmation);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const panel = panelRef.current;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = panel?.closest(".order-cart-overlay");
    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > *")].filter((element) => element !== overlay);
    const backgroundState = backgroundElements.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    const previousOverflow = document.body.style.overflow;
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeDrawer(); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => element.tabIndex >= 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [closeDrawer, drawerOpen]);

  const whatsappUrl = items.length ? buildOrderWhatsAppUrl(items, SITE_URL) : "#";
  return <div className={drawerOpen ? "order-cart-overlay open" : "order-cart-overlay"} aria-hidden={!drawerOpen} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
    <aside ref={panelRef} id="order-cart-drawer" className="order-cart-drawer" role="dialog" aria-modal={drawerOpen ? "true" : undefined} aria-hidden={!drawerOpen} inert={!drawerOpen} aria-labelledby="order-cart-title">
      <header className="order-cart-header"><div><h2 id="order-cart-title">سلة الطلبات</h2><span>{totalQuantity} إجمالي الكمية</span></div><button ref={closeRef} type="button" className="drawer-close" onClick={closeDrawer} aria-label="إغلاق سلة الطلبات">×</button></header>
      {items.length ? <>
        <div className="order-cart-list">{items.map((item) => <article className="order-cart-item" key={item.key}>
          <Image src={item.image} alt="" width={92} height={92} sizes="72px" />
          <div className="order-cart-item-copy"><Link href={item.productUrl} onClick={closeDrawer}>{item.productName}</Link>{item.variant && item.variant.code !== INK_FULL_SET_VARIANT_CODE ? <span>اللون: {item.variant.label} ({item.variant.code})</span> : null}<div className="order-cart-item-actions"><div className="order-cart-quantity" aria-label={`كمية ${item.productName}`}><button type="button" onClick={() => decrement(item.key)} disabled={item.quantity === 1} aria-label={`تقليل كمية ${item.productName}`}>−</button><b>{item.quantity}</b><button type="button" onClick={() => increment(item.key)} aria-label={`زيادة كمية ${item.productName}`}>+</button></div><button type="button" className="order-cart-remove" onClick={() => removeItem(item.key)} aria-label={`إزالة ${item.productName} من السلة`}>حذف</button></div></div>
        </article>)}</div>
        <footer className="order-cart-footer">
          <a className="order-cart-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer">إرسال الطلب عبر واتساب</a>
          {confirmClear ? <div className="order-cart-clear-confirm" role="group" aria-label="تأكيد تفريغ السلة"><span>تفريغ جميع العناصر؟</span><button type="button" onClick={() => { clearCart(); setConfirmClear(false); }}>نعم، تفريغ</button><button type="button" onClick={() => setConfirmClear(false)}>إلغاء</button></div> : <button type="button" className="order-cart-clear" onClick={() => setConfirmClear(true)}>تفريغ السلة</button>}
        </footer>
      </> : <div className="order-cart-empty"><CartIcon/><h3>سلة الطلبات فارغة</h3><p>أضف المنتجات التي تريد الاستفسار عنها أو طلبها.</p><Link href="/categories" onClick={closeDrawer}>تصفح المنتجات</Link></div>}
    </aside>
  </div>;
}
