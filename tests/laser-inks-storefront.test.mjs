import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PUBLIC_CATEGORY_DETAILS,
  productBelongsToPublicCategory,
} from "../app/public-categories.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const products = [
  { id: 1, category: "inks" },
  { id: 2, category: "laser_inks" },
  { id: 3, category: "laser_inks" },
];

test("normal and laser ink storefront collections are disjoint by stored category", () => {
  const normalIds = products.filter((product) => productBelongsToPublicCategory(product.category, "inks")).map(({ id }) => id);
  const laserIds = products.filter((product) => productBelongsToPublicCategory(product.category, "laser_inks")).map(({ id }) => id);
  assert.deepEqual(normalIds, [1]);
  assert.deepEqual(laserIds, [2, 3]);
  assert.deepEqual(normalIds.filter((id) => laserIds.includes(id)), []);
});

test("laser inks have an independent public collection link", () => {
  assert.equal(PUBLIC_CATEGORY_DETAILS.laser_inks.label, "أحبار الليزر");
  assert.equal(PUBLIC_CATEGORY_DETAILS.laser_inks.href, "/laser-inks");
});

test("homepage renders the laser section dynamically after normal inks", async () => {
  const [home, links] = await Promise.all([read("app/home-client.tsx"), read("app/storefront-category-links.tsx")]);
  assert.match(links, /\["printers", "papers", "inks", "laser_inks"\]/);
  assert.match(home, /productBelongsToPublicCategory\(product\.category, categoryId\)/);
  assert.match(home, /<HomeProductSlider products=\{productCards\}/);
  assert.match(home, /<a href=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href\}>عرض الكل/);
});

test("homepage and category index use a real loaded laser product image", async () => {
  const [home, categories, links] = await Promise.all([read("app/home-client.tsx"), read("app/categories/page.tsx"), read("app/storefront-category-links.tsx")]);
  assert.match(home, /<StorefrontCategoryLinks products=\{products\}\/>/);
  assert.match(categories, /<StorefrontCategoryLinks products=\{data\.products\}\/>/);
  assert.match(links, /products\.find\(\(product\) => isLaserInkCategory\(product\.category\) && product\.image\.trim\(\)\)\?\.image/);
});

test("normal inks and laser inks collection routes filter independently", async () => {
  const [inks, laser] = await Promise.all([read("app/inks/page.tsx"), read("app/laser-inks/page.tsx")]);
  assert.match(inks, /product\.category === "inks"/);
  assert.doesNotMatch(inks, /isInkCategory\(product\.category\)/);
  assert.match(laser, /isLaserInkCategory\(product\.category\)/);
  assert.match(laser, /category="laser_inks"/);
});

test("laser collection cards keep the existing ink details route and actions", async () => {
  const client = await read("app/category-products-client.tsx");
  assert.match(client, /isInkCategory\(product\.category\) \? "inks" : category/);
  assert.match(client, /<ProductModelChips product=\{product\} detailsHref=\{detailsHref\} \/>/);
  assert.match(client, /ProductCardCartButton category=\{cartCategory\}/);
  assert.match(client, /toggleFavorite\(product\.id\)/);
});

test("laser product details return to the independent collection", async () => {
  const details = await read("app/inks/[slug]/page.tsx");
  assert.match(details, /const collectionHref = laserInk \? "\/laser-inks" : "\/inks"/);
  assert.match(details, /<LaserInkModelSelector/);
});

test("laser section inherits the single-row desktop drag and mobile swipe rail", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  assert.match(home, /function HomeProductSlider/);
  assert.match(home, /event\.currentTarget\.scrollLeft = dragState\.current\.startScrollLeft - distance/);
  assert.match(styles, /\.home-category-products \{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;/);
  assert.match(styles, /touch-action:pan-x pan-y/);
});
