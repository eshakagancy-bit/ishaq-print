import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("storefront header exposes a real right-side navigation drawer", () => {
  assert.match(home, /id="site-menu-drawer" className="site-menu-drawer" role="dialog" aria-modal=\{menuOpen \? "true" : undefined\}/);
  assert.match(styles, /\.menu-overlay \{[^}]*position:fixed;[^}]*background:rgba\(2,12,23,\.7\)/);
  assert.match(styles, /\.site-menu-drawer \{[^}]*right:0;[^}]*transform:translateX\(100%\)/);
  assert.match(styles, /\.menu-overlay\.menu-open \.site-menu-drawer \{ transform:translateX\(0\)/);
});

test("drawer contains only real Ishaq destinations and contact flows", () => {
  for (const href of ["/categories", "/printers", "/inks", "/papers"]) assert.match(home, new RegExp(`href="${href}"`));
  assert.match(home, /قائمة الرغبات/);
  assert.match(home, /روابط مهمة/);
  assert.match(home, /href=\{customerPhoneHref\}/);
  assert.match(home, /href=\{generalWaLink\(settings\.generalWhatsapp\)\}/);
  assert.doesNotMatch(home, /Shopping Cart|سلة التسوق/);
});

test("drawer supports every close path and modal focus behavior", () => {
  assert.match(home, /className="drawer-close"[^>]*onClick=\{\(\) => setActiveHeaderDrawer\("closed"\)\}/);
  assert.match(home, /if \(event\.target === event\.currentTarget\) setActiveHeaderDrawer\("closed"\)/);
  assert.match(home, /event\.key === "Escape"/);
  assert.match(home, /setActiveHeaderDrawer\("closed"\);[\s\S]*?requestSectionScroll/);
  assert.match(home, /event\.key !== "Tab"/);
  assert.match(home, /document\.body\.style\.overflow = "hidden"/);
  assert.match(home, /#site-menu-drawer \.drawer-close/);
});

test("minimal header, wishlist and search use one mutually exclusive drawer state", () => {
  assert.doesNotMatch(home, /<nav className="nav-links"/);
  assert.doesNotMatch(home, /className="nav-contact"/);
  assert.match(home, /useState<"closed" \| "menu" \| "wishlist" \| "search">\("closed"\)/);
  assert.match(home, /id="wishlist-drawer" className="favorites-panel wishlist-drawer"/);
  assert.match(styles, /\.wishlist-drawer \{[^}]*left:0;[^}]*transform:translateX\(-100%\)/);
  assert.match(styles, /\.menu-overlay\.wishlist-open \.wishlist-drawer \{ transform:translateX\(0\)/);
  assert.match(home, /favorites\.length > 0 && <b>\{favorites\.length\}<\/b>/);
  assert.match(home, /لا توجد منتجات في قائمة الرغبات/);
  assert.match(home, /href="\/categories"[\s\S]*?>تسوق الآن<\/Link>/);
});

test("drawer uses consistent decorative SVG icons rather than unicode navigation glyphs", () => {
  assert.match(home, /function DrawerIcon/);
  assert.match(home, /<svg viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(styles, /\.drawer-nav svg,\.drawer-important-links svg,\.drawer-contact-area svg/);
});
