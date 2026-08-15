import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home uses one wide draggable product strip at every viewport", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.products-section>\.container \{ width:min\(1600px,calc\(100% - 48px\)\); \}/);
  assert.match(styles, /\.home-category-products \{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;[\s\S]*?scroll-snap-type:x proximity;/);
  assert.match(styles, /\.home-category-products \.product-card \{[\s\S]*?flex:0 0 clamp\(206px,15\.2vw,224px\);/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.home-category-products \.product-card \{[\s\S]*?flex-basis:min\(74vw,286px\);/);
  assert.match(home, /<HomeProductSlider products=\{productCards\} label=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.label\} \/>/);
  assert.match(home, /PRODUCT_DRAG_THRESHOLD = 7/);
  assert.match(home, /onPointerDown=/);
  assert.match(home, /onPointerMove=/);
  assert.match(home, /onPointerUp=\{finishDrag\}/);
  assert.match(home, /onPointerCancel=\{finishDrag\}/);
  assert.match(home, /onClickCapture=/);
  assert.match(home, /event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\)/);
  assert.doesNotMatch(home, /product-group-controls|HOME_DESKTOP_GROUP_SIZE|HOME_MOBILE_GROUP_SIZE|chunkProducts/);
  assert.doesNotMatch(home, /home-category-(?:desktop|mobile)-products/);
  assert.doesNotMatch(styles, /home-category-(?:desktop|mobile)-products/);
  assert.doesNotMatch(styles, /\.product-group-controls/);
  assert.doesNotMatch(styles, /zoom\s*:|transform\s*:\s*scale\([^)]*\)\s*;\s*\/\*\s*desktop/i);
});
