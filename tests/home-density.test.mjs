import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("home prioritizes category discovery and products before support controls", () => {
  const hero = home.indexOf('className="hero hero-slider"');
  const categoryCards = home.indexOf('className="storefront-categories"');
  const categories = home.indexOf('className="category-strip home-category-strip');
  const products = home.indexOf('className="products-section"');
  assert.ok(hero < categoryCards && categoryCards < products && products < categories);
  assert.doesNotMatch(home, /className="search-panel-wrap"|id="general-search"/);
  assert.match(styles, /@media \(max-width:820px\)[\s\S]*?\.home-category-strip \{[^}]*display:block;[^}]*overflow-x:auto;[^}]*touch-action:pan-x;/);
});

test("home keeps every principal section and all category links", () => {
  for (const section of ["products", "services", "contact"]) {
    assert.match(home, new RegExp(`id="${section}"`));
  }
  assert.doesNotMatch(home, /className="maintenance-hero"|id="maintenance"/);
  assert.match(home, /pageView === "maintenance"/);
  assert.match(home, /homeCategoryOrder\.map/);
  assert.match(home, /PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href/);
  assert.match(home, /<footer>/);
});

test("home remains one responsive product slider per category", () => {
  assert.match(home, /const productCards = categoryProducts\.map\(renderProductCard\)/);
  assert.match(home, /<HomeProductSlider products=\{productCards\}/);
  assert.doesNotMatch(home, /chunkProducts|productGroups|product-group/);
  assert.doesNotMatch(home, /home-category-(?:desktop|mobile)-products/);
  assert.match(styles, /\.home-category-sections \{ gap:clamp\(52px,5vw,76px\); \}/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.home-category-sections \{ gap:44px; \}/);
});

test("large vertical sections are compacted without being hidden", () => {
  assert.match(styles, /\.products-section \{ padding:20px 0 80px;/);
  assert.doesNotMatch(home, /className="feature-band"|className="feature-image"|className="feature-copy"/);
  assert.match(styles, /\.services \{ padding:78px 0;/);
  assert.doesNotMatch(styles, /\.maintenance-hero|\.maintenance-grid/);
  assert.match(styles, /\.maintenance-page-hero \{[^}]*min-height:500px;/);
  assert.match(styles, /\.contact-banner-inner \{ min-height:175px;/);
  assert.doesNotMatch(styles, /\.feature-band|\.feature-band-inner|\.feature-image|\.feature-copy|\.cyan-disc/);
  assert.doesNotMatch(styles, /(?:products-section|services|maintenance-grid)[^}]*display:none/);
});
