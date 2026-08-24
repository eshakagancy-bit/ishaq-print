import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("cart UI exposes the badge, accessible drawer, empty state, controls, and WhatsApp action", async () => {
  const source = await read("app/order-cart-ui.tsx");
  assert.match(source, /totalQuantity > 0/);
  assert.match(source, /aria-haspopup="dialog"/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal=/);
  assert.match(source, /increment\(item\.key\)/);
  assert.match(source, /decrement\(item\.key\)/);
  assert.match(source, /removeItem\(item\.key\)/);
  assert.match(source, /clearCart\(\)/);
  assert.match(source, /سلة الطلبات فارغة/);
  assert.match(source, /buildOrderWhatsAppUrl/);
});

test("ink selector exposes a synthetic full-set option alongside verified colors", async () => {
  const source = await read("app/ink-variant-selector.tsx");
  assert.match(source, /variants\[0\]/);
  assert.match(source, /INK_FULL_SET_VARIANT_CODE/);
  assert.match(source, /INK_FULL_SET_VARIANT_LABEL/);
  assert.match(source, /image: fallbackImage/);
  assert.match(source, /options = \[fullSetOption, \.\.\.variants\]/);
  assert.match(source, /aria-pressed=/);
  assert.match(source, /variant: \{ code: selected\.code, label: selected\.label \}/);
  assert.match(source, /image: selected\.image/);
  assert.match(source, /AddToCartButton/);
});

test("all public product details expose cart access and the correct add flow", async () => {
  const [printers, papers, inks] = await Promise.all([
    read("app/printers/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
  ]);
  for (const source of [printers, papers, inks]) {
    assert.match(source, /CartHeaderButton/);
    assert.match(source, /CartDrawerOverlay/);
  }
  assert.match(printers, /productType: "printer"/);
  assert.match(papers, /productType: "paper"/);
  assert.match(inks, /InkVariantSelector/);
});

test("header drawers announce a shared mutually exclusive state", async () => {
  const [provider, home, search] = await Promise.all([
    read("app/order-cart-provider.tsx"),
    read("app/home-client.tsx"),
    read("app/global-search-drawer.tsx"),
  ]);
  assert.match(provider, /"menu" \| "wishlist" \| "search" \| "cart"/);
  assert.match(provider, /announceHeaderDrawer\("cart"\)/);
  assert.match(home, /announceHeaderDrawer\("menu"\)/);
  assert.match(home, /announceHeaderDrawer\("wishlist"\)/);
  assert.match(home, /announceHeaderDrawer\("search"\)/);
  assert.match(search, /HEADER_DRAWER_EVENT/);
});

test("cart thumbnails use the existing storefront image path without Next image optimization", async () => {
  const source = await read("app/order-cart-ui.tsx");
  assert.match(source, /import Image from "\.\/storefront-image"/);
  assert.doesNotMatch(source, /from "next\/image"/);
});
