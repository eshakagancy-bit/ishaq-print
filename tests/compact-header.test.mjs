import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("all storefront main headers share one stable sticky rule", () => {
  assert.match(styles, /\.header,\.category-products-header,\.categories-index-header,\.printer-details-header \{ position:sticky; top:0; z-index:35; \}/);
  assert.match(home, /<header className="header">/);
  assert.doesNotMatch(home, /headerCompact|setHeaderCompact|nextHeaderCompact/);
  assert.doesNotMatch(styles, /\.header\.compact/);
  assert.equal((home.match(/addEventListener\("scroll"/g) ?? []).length, 1);
});

test("sticky headers retain fixed desktop and mobile dimensions", () => {
  assert.match(styles, /\.nav-wrap \{ height:84px;[^}]*grid-template-columns:1fr auto 1fr;[^}]*transition:height \.22s ease;/);
  assert.match(styles, /\.nav-wrap \{ height:76px; \}/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.nav-wrap \{ height:68px; \}/);
  assert.match(home, /className="favorite-counter"/);
  assert.match(home, /className="menu-btn"/);
  assert.doesNotMatch(home, /className="nav-contact"/);
});

test("drawers and modals remain above the sticky header", () => {
  assert.match(styles, /\.modal-backdrop \{[^}]*z-index:50;/);
  assert.match(styles, /\.menu-overlay \{[^}]*z-index:100;/);
  assert.match(styles, /\.order-cart-overlay \{[^}]*z-index:140;/);
  assert.match(styles, /\.site-menu-drawer \{[^}]*height:100dvh;/);
  assert.match(styles, /\.menu-overlay\.menu-open \.site-menu-drawer \{ transform:translateX\(0\); \}/);
  assert.match(home, /aria-expanded=\{menuOpen\}/);
});
