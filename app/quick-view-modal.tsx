"use client";

import { useEffect, useRef } from "react";
import InkImageCarousel from "./ink-image-carousel";
import type { SpecificationDisplayRow } from "./printer-specifications";

type QuickViewModalProps = {
  id: number;
  title: string;
  categoryLabel?: string;
  family?: string;
  badge?: string;
  description?: string;
  price?: string;
  images: string[];
  rows: SpecificationDisplayRow[];
  detailsHref: string;
  whatsappHref: string;
  whatsappLabel: string;
  footerNote?: string;
  trigger: HTMLElement | null;
  onClose: () => void;
};

export default function QuickViewModal({
  id, title, categoryLabel, family, badge, description, price, images, rows,
  detailsHref, whatsappHref, whatsappLabel, footerNote, trigger, onClose,
}: QuickViewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > :not(.modal-backdrop)")];
    const backgroundState = backgroundElements.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    const bodyOverflow = document.body.style.overflow;
    const documentOverflow = document.documentElement.style.overflow;
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) { event.preventDefault(); closeRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = documentOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.requestAnimationFrame(() => { if (trigger?.isConnected) trigger.focus(); });
    };
  }, [onClose, trigger]);

  const titleId = `product-dialog-title-${id}`;
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div ref={dialogRef} className="product-modal-shell" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="إغلاق">×</button>
      <div className="product-modal">
        <div className="modal-image"><InkImageCarousel images={images.length ? images : [""]} alt={title} variant="quick" /></div>
        <div className="modal-content">
          {badge?.trim() && <span className="modal-product-badge">{badge}</span>}
          {categoryLabel?.trim() && <span className="modal-category">{categoryLabel}</span>}
          {family?.trim() && <span className="product-family">{family}</span>}
          <h2 id={titleId}>{title}</h2>
          {description?.trim() && <p>{description}</p>}
          {price?.trim() && <div className="modal-price"><small>السعر</small><strong>{price}</strong></div>}
          {rows.length > 0 && <dl className="modal-specs">{rows.map((row) => <div key={row.key} className={row.state === false ? "negative" : row.state === true ? "positive" : ""}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
          <a className="secondary-btn modal-more-details" href={detailsHref}>تفاصيل أكثر <span>←</span></a>
          <a className="primary-btn" href={whatsappHref} target="_blank" rel="noreferrer">{whatsappLabel} <span>←</span></a>
          {footerNote?.trim() && <small>{footerNote}</small>}
        </div>
      </div>
    </div>
  </div>;
}
