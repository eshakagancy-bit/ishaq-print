"use client";

import { useState } from "react";
import { normalizeYemenPhone, yemenTelHref } from "./contact-links";
import { defaultSiteSettings, type SiteSettings } from "./site-defaults";

export default function PublicTopBar({ settings }: { settings: SiteSettings }) {
  const [copied, setCopied] = useState(false);
  const customerPhone = normalizeYemenPhone(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const customerPhoneDisplay = customerPhone.replace(/^967/, "");
  const customerPhoneHref = yemenTelHref(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);

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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <div className="topbar">
    <div className="container topbar-inner">
      <span>📍 {settings.address}</span>
      <div className="topbar-links"><span>توصيل إلى جميع المحافظات</span><span className="topbar-customer"><a dir="ltr" href={customerPhoneHref} aria-label={`الاتصال بخدمة العملاء على الرقم ${customerPhoneDisplay}`}>خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone} aria-label={`نسخ رقم خدمة العملاء ${customerPhoneDisplay}`}>{copied ? "تم النسخ ✓" : "نسخ"}</button></span></div>
    </div>
  </div>;
}
