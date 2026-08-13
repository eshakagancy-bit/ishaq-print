import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeYemenPhone, yemenTelHref, yemenWhatsappHref } from "../app/contact-links.ts";

test("normalizes Yemen telephone and WhatsApp links without changing their messages", () => {
  assert.equal(normalizeYemenPhone("01472266"), "9671472266");
  assert.equal(normalizeYemenPhone("+967 774-666-202"), "967774666202");
  assert.equal(normalizeYemenPhone("invalid", "967777000725"), "967777000725");
  assert.equal(yemenTelHref("01472266"), "tel:+9671472266");

  const message = "رسالة تواصل جاهزة";
  const whatsapp = new URL(yemenWhatsappHref("+967 777-000-725", message));
  assert.equal(`${whatsapp.origin}${whatsapp.pathname}`, "https://wa.me/967777000725");
  assert.equal(whatsapp.searchParams.get("text"), message);
  assert.doesNotMatch(whatsapp.pathname, /\+/);
});

test("keeps customer service, maintenance, sales and specialist numbers in their existing roles", async () => {
  const [home, defaults, categoryClient, printer, ink, paper] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/site-defaults.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/printers/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/inks/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/papers/[slug]/page.tsx", import.meta.url), "utf8"),
  ]);
  const combined = [home, defaults, categoryClient, printer, ink, paper].join("\n");

  assert.doesNotMatch(combined, /about:invalid|href=""|wa\.me\/\+/);
  assert.doesNotMatch(home, /tel:\$\{settings\.salesPhone\}|tel:01472266/);
  assert.match(defaults, /salesPhone: "01472266"/);
  assert.match(defaults, /customerServicePhone: "967774666202"/);
  assert.match(defaults, /generalWhatsapp: "967777000725"/);
  assert.match(home, /salesPhoneHref = yemenTelHref\(settings\.salesPhone, defaultSiteSettings\.salesPhone\)/);
  assert.match(home, /customerPhoneHref = yemenTelHref\(settings\.customerServicePhone, defaultSiteSettings\.customerServicePhone\)/);
  assert.match(home, /الصيانة 1", phone: "967777103838"/);
  assert.match(home, /الصيانة 2", phone: "967781103838"/);
  assert.match(home, /maintenanceWaLink\(contact\.phone\)/);
  assert.match(home, /yemenTelHref\(contact\.phone\)/);
  assert.match(combined, /967778989866/);
  assert.match(combined, /\?text=\$\{encodeURIComponent\(/);
});

test("labels every main contact channel without changing its linked role", async () => {
  const home = await readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8");

  assert.match(home, /href=\{customerPhoneHref\}[^>]*>خدمة العملاء: \{customerPhoneDisplay\}<\/a>/);
  assert.match(home, /className="nav-contact" href=\{generalWaLink\(settings\.generalWhatsapp\)\}[^>]*>استشارات ومبيعات<\/a>/);
  assert.match(home, /href=\{generalWaLink\(settings\.generalWhatsapp\)\}[^>]*>استشارات ومبيعات: \{generalWhatsappDisplay\}<\/a>/);
  assert.match(home, /href=\{salesPhoneHref\}>هاتف المبيعات: \{settings\.salesPhone\}<\/a>/);
  assert.match(home, /label: "الصيانة 1", phone: "967777103838"/);
  assert.match(home, /label: "الصيانة 2", phone: "967781103838"/);
  assert.match(home, /href=\{maintenanceWaLink\(contact\.phone\)\}[^>]*aria-label=\{`واتساب \$\{contact\.label\}/);
  assert.match(home, /href=\{yemenTelHref\(contact\.phone\)\}[^>]*aria-label=\{`اتصال هاتفي بـ \$\{contact\.label\}/);
});
