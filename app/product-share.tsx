"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { buildWhatsAppShareUrl } from "./product-sharing";

type ProductShareProps = {
  productName: string;
  productUrl: string;
};

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
}

function subscribeToOrigin() {
  return () => undefined;
}

export default function ProductShare({ productName, productUrl }: ProductShareProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const feedbackTimerRef = useRef<number | undefined>(undefined);
  const menuId = useId();
  const resolvedUrl = useSyncExternalStore(
    subscribeToOrigin,
    () => new URL(productUrl, window.location.origin).href,
    () => productUrl,
  );

  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [open]);

  useEffect(() => () => {
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  const showCopiedFeedback = () => {
    setFeedback("تم نسخ الرابط");
    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => setFeedback(""), 2200);
  };

  const copyLink = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied) copied = copyWithFallback(resolvedUrl);
    setOpen(false);
    if (copied) showCopiedFeedback();
  };

  return <div className="product-share" ref={rootRef}>
    <button
      ref={triggerRef}
      type="button"
      className="product-share-trigger"
      aria-label="مشاركة المنتج"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={() => setOpen((current) => !current)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
      <span>مشاركة</span>
    </button>
    {open && <div id={menuId} className="product-share-menu" role="menu" aria-label="خيارات مشاركة المنتج">
      <a
        href={buildWhatsAppShareUrl(productName, resolvedUrl)}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        onClick={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            event.currentTarget.click();
          }
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.3 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.8c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6.7 1.3 1.7 2.3 3 2.9.2.1.4.1.6-.1l.8-1c.2-.2.4-.3.7-.2l1.8.8c.3.1.4.3.4.6 0 .8-.4 1.6-1 2.1-.5.5-1.3.8-2.2.6-1.2-.2-3.2-1-5-2.7-1.5-1.4-2.6-3.3-2.9-4.6-.2-.8.1-1.6.6-2.2Z"/></svg>
        <span>مشاركة عبر واتساب</span>
      </a>
      <button type="button" role="menuitem" onClick={copyLink}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5 14.5 9"/><path d="m7.2 17.8-1 1a3.5 3.5 0 0 1-5-5l3.1-3.1a3.5 3.5 0 0 1 5 0"/><path d="m16.8 6.2 1-1a3.5 3.5 0 0 1 5 5l-3.1 3.1a3.5 3.5 0 0 1-5 0"/></svg>
        <span>نسخ الرابط</span>
      </button>
    </div>}
    <span className="product-share-feedback" role="status" aria-live="polite">{feedback}</span>
  </div>;
}
