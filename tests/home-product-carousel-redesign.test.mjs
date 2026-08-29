import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage product sections share one zero-wrap strip without navigation controls", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);

  assert.match(home, /STOREFRONT_CATEGORY_ORDER\.map/);
  assert.match(home, /<HomeProductSlider products=\{productCards\}/);
  assert.doesNotMatch(home, /product-group-controls|المجموعة السابقة|المجموعة التالية|pagination|carousel-dot/);
  assert.match(styles, /\.home-category-products \{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;/);
  assert.match(styles, /scroll-snap-type:x proximity/);
  assert.match(styles, /scrollbar-width:none/);
  assert.match(styles, /\.home-category-products::-webkit-scrollbar \{ display:none; \}/);
  assert.doesNotMatch(styles, /\.product-group-controls|\.home-category-products[^}]*flex-wrap:wrap/);
});

test("homepage card stays image-first and preserves factual navigation and actions", async () => {
  const home = await read("app/home-client.tsx");
  const cardStart = home.indexOf("const renderProductCard");
  const card = home.slice(cardStart, home.indexOf("return (", cardStart));

  assert.match(card, /className="product-card-link" href=\{detailsHref\}/);
  assert.match(card, /\? "heart active" : "heart"/);
  assert.match(card, /className="quick-view"/);
  assert.match(card, /className="product-category-line"/);
  assert.match(card, /className="product-image"/);
  assert.doesNotMatch(card, /السعر عند الطلب|اعرف السعر والتوفر|تفاصيل سريعة<\/button>|product-footer|productPriceLabel/);
  assert.match(home, /HOME_PRINTER_LABELS\[product\.printerCategory\]/);
  assert.match(home, /product\.inkSpecifications\?\.inkType\?\.trim\(\) \|\| product\.type/);
  assert.match(home, /product\.paperSpecifications\?\.paperType\?\.trim\(\) \|\| product\.type/);
});

test("desktop drag has threshold, RTL-safe relative scrolling and click protection", async () => {
  const home = await read("app/home-client.tsx");

  assert.match(home, /PRODUCT_DRAG_THRESHOLD = 7/);
  assert.match(home, /event\.pointerType !== "mouse" && event\.pointerType !== "pen"/);
  assert.match(home, /closest\("button"\)/);
  assert.match(home, /setPointerCapture\(event\.pointerId\)/);
  assert.match(home, /Math\.abs\(distance\) < PRODUCT_DRAG_THRESHOLD/);
  assert.match(home, /scrollLeft = dragState\.current\.startScrollLeft - distance/);
  assert.match(home, /onPointerUp=\{finishDrag\}/);
  assert.match(home, /onPointerCancel=\{finishDrag\}/);
  assert.match(home, /window\.setTimeout\(\(\) => \{ dragState\.current\.dragged = false; \}, 0\)/);
  assert.match(home, /onClickCapture=[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\)/);
});

test("native touch, keyboard access, grab feedback and native image drag protection remain enabled", async () => {
  const [home, carousel, styles] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/ink-image-carousel.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(home, /role="region"[\s\S]*?tabIndex=\{0\}/);
  assert.match(styles, /touch-action:pan-x pan-y/);
  assert.match(styles, /cursor:grab/);
  assert.match(styles, /\.home-category-products\.is-dragging \{[^}]*cursor:grabbing;[^}]*user-select:none;/);
  assert.match(home, /draggable=\{false\}/);
  assert.match(carousel, /draggable=\{false\}/);
});
