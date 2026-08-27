import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("small screens render three compact category cards per row", () => {
  assert.match(styles, /@media \(max-width:430px\)[\s\S]*?\.category-products-list,[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\); gap:6px;/);
  assert.match(styles, /\.category-product-image,[\s\S]*?aspect-ratio:1\/1;/);
  assert.match(styles, /\.category-product-content,[\s\S]*?padding:6px;/);
});

test("homepage keeps horizontal scrolling with approximately three visible cards", () => {
  assert.match(styles, /\.home-category-products \{ gap:7px;[\s\S]*?scroll-padding-inline:14px;/);
  assert.match(styles, /flex-basis:calc\(\(100vw - 56px\)\/3\);/);
  assert.match(styles, /width:calc\(\(100vw - 56px\)\/3\);/);
  assert.match(styles, /\.home-category-products \{[\s\S]*?overflow-x:auto;/);
});

test("mobile controls remain present and scale with the compact cards", () => {
  assert.match(styles, /\.product-card-cart,[\s\S]*?width:25px; height:25px;/);
  assert.match(styles, /\.heart,[\s\S]*?width:25px; height:25px;/);
  assert.match(styles, /\.product-image \.quick-view,[\s\S]*?width:25px; height:25px; min-height:25px;/);
});
