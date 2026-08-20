"use client";

import Image from "./storefront-image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isOpenInAden } from "./business-hours";
import { normalizeYemenPhone, yemenTelHref, yemenWhatsappHref } from "./contact-links";
import { defaultSiteSettings, type SiteSettings } from "./site-defaults";

const DEFAULT_IMAGE_SRC = "/brand/eshak-logo.png";

function imageSrcOrFallback(value: string | null | undefined) {
  return value?.trim() || DEFAULT_IMAGE_SRC;
}

function generalWaLink(phone: string) {
  return yemenWhatsappHref(phone, "مرحبًا وكالة إسحاق العالمية، أريد استشارة بخصوص المنتجات المتوفرة لديكم.", defaultSiteSettings.generalWhatsapp);
}

export default function StorefrontFooter({ settings, onHomeClick }: { settings: SiteSettings; onHomeClick?: () => void }) {
  const [customerPhoneCopied, setCustomerPhoneCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const customerPhone = normalizeYemenPhone(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const customerPhoneDisplay = customerPhone.replace(/^967/, "");
  const customerPhoneHref = yemenTelHref(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const salesPhoneHref = yemenTelHref(settings.salesPhone, defaultSiteSettings.salesPhone);
  const generalWhatsappPhone = normalizeYemenPhone(settings.generalWhatsapp, defaultSiteSettings.generalWhatsapp);
  const generalWhatsappDisplay = generalWhatsappPhone.replace(/^967/, "");
  const businessIsOpen = isOpenInAden(currentTime, settings);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const copyCustomerPhone = async () => {
    try {
      await navigator.clipboard.writeText(customerPhoneDisplay);
    } catch {
      const input = document.createElement("textarea");
      input.value = customerPhoneDisplay;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCustomerPhoneCopied(true);
    window.setTimeout(() => setCustomerPhoneCopied(false), 1800);
  };

  return <footer><div className="container footer-grid storefront-footer-grid">
    <div className="footer-brand"><Image src={imageSrcOrFallback(settings.logoImage)} alt="وكالة إسحاق العالمية" width={210} height={90} sizes="190px" loading="lazy" /><p>حلول تقنية وتجارية وتجهيزات موثوقة للأفراد والشركات والمؤسسات في اليمن.</p><div className="footer-social"><h3>تابعنا</h3><div className="footer-social-links"><a href="https://www.instagram.com/eshak_gruop_agancy" target="_blank" rel="noopener noreferrer" aria-label="Instagram - وكالة إسحاق العالمية"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" className="social-dot"/></svg><span>Instagram</span></a><a href="https://www.facebook.com/EshakAgency" target="_blank" rel="noopener noreferrer" aria-label="Facebook - وكالة إسحاق العالمية"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v6h4v-6h3.2l.8-4h-4V9c0-.7.3-1 1-1Z"/></svg><span>Facebook</span></a></div></div></div>
    <div><h3>الفئات</h3><Link href="/printers">الطابعات</Link><Link href="/inks">الأحبار</Link><Link href="/papers">الأوراق</Link><Link href="/categories">جميع الفئات</Link></div>
    <div><h3>روابط مهمة</h3>{onHomeClick ? <a href="#home" onClick={(event) => { event.preventDefault(); onHomeClick(); }}>الرئيسية</a> : <Link href="/">الرئيسية</Link>}<Link href="/#services">خدماتنا</Link><Link href="/maintenance">الصيانة والدعم الفني</Link><Link href="/#contact">تواصل معنا</Link></div>
    <div><h3>تواصل معنا</h3><a href={customerPhoneHref} dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button className="footer-copy-phone" type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ الرقم"}</button><a href={salesPhoneHref}>هاتف المبيعات: {settings.salesPhone}</a><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">استشارات ومبيعات: {generalWhatsappDisplay}</a><p>{settings.address}</p></div>
    <div><h3>أوقات العمل</h3><p>{settings.workDays}</p><p>{settings.workHours}</p><span className={businessIsOpen ? "open-label" : "open-label closed"}>{businessIsOpen ? "● متاحون الآن" : "● مغلق الآن"}</span></div>
  </div><div className="container copyright"><span>© 2026 وكالة إسحاق العالمية. جميع الحقوق محفوظة.</span><span>EPSON وWorkForce علامتان تجاريتان مملوكتان لأصحابهما.</span></div></footer>;
}
