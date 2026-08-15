import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { yemenTelHref, yemenWhatsappHref } from "../app/contact-links.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("moves maintenance from the homepage into a dedicated route", async () => {
  const [home, page] = await Promise.all([read("app/home-client.tsx"), read("app/maintenance/page.tsx")]);
  assert.doesNotMatch(home, /className="maintenance-hero"|id="maintenance"/);
  assert.match(home, /\{pageView === "maintenance" && <div className="maintenance-page">/);
  assert.match(page, /initialPage="maintenance"/);
  assert.match(page, /title: "الصيانة والدعم الفني \| وكالة إسحاق العالمية"/);
  assert.match(page, /publicMetadata\(\{/);
  assert.match(page, /path: "\/maintenance"/);
});

test("preserves both maintenance phone and WhatsApp destinations exactly", () => {
  const maintenanceContacts = [
    { phone: "967777103838", display: "777103838" },
    { phone: "967781103838", display: "781103838" },
  ];
  const message = "مرحبًا، أريد التواصل مع قسم الصيانة في وكالة إسحاق العالمية.";
  assert.deepEqual(maintenanceContacts.map(({ display }) => display), ["777103838", "781103838"]);
  assert.deepEqual(maintenanceContacts.map(({ phone }) => yemenTelHref(phone)), ["tel:+967777103838", "tel:+967781103838"]);
  for (const contact of maintenanceContacts) {
    const whatsapp = new URL(yemenWhatsappHref(contact.phone, message));
    assert.equal(`${whatsapp.origin}${whatsapp.pathname}`, `https://wa.me/${contact.phone}`);
    assert.equal(whatsapp.searchParams.get("text"), message);
  }
});

test("maintenance page uses the shared storefront shell and accessible service structure", async () => {
  const [home, footer, styles] = await Promise.all([read("app/home-client.tsx"), read("app/storefront-footer.tsx"), read("app/globals.css")]);
  assert.match(home, /<header className=/);
  assert.match(home, /id="site-menu-drawer"/);
  assert.match(home, /id="wishlist-drawer"/);
  assert.match(home, /id="search-drawer"/);
  assert.match(home, /<StorefrontFooter/);
  assert.match(footer, /<footer>/);
  assert.match(home, /<h1 id="maintenance-page-title">الصيانة والدعم الفني<\/h1>/);
  assert.match(home, /aria-labelledby="maintenance-services-title"/);
  assert.match(home, /aria-labelledby="maintenance-contact-title"/);
  assert.match(home, /href=\{yemenTelHref\(contact\.phone\)\}/);
  assert.match(home, /href=\{maintenanceWhatsappHref\(contact\.phone\)\}/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.maintenance-contact-layout \{ grid-template-columns:1fr;/);
});

test("menu item navigates to maintenance and closes the drawer", async () => {
  const home = await read("app/home-client.tsx");
  assert.match(home, /<Link href="\/maintenance"[^>]*onClick=\{\(\) => setActiveHeaderDrawer\("closed"\)\}/);
  assert.match(home, /aria-current=\{pageView === "maintenance" \? "page" : undefined\}/);
});
