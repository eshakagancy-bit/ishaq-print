import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("home prioritizes category discovery then search before products", () => {
  const hero = home.indexOf('className="hero hero-slider"');
  const categoryCards = home.indexOf('className="storefront-categories"');
  const search = home.indexOf('className="search-panel-wrap"');
  const categories = home.indexOf('className="category-strip home-category-strip');
  const products = home.indexOf('className="products-section"');
  assert.ok(hero < categoryCards && categoryCards < search && search < categories && categories < products);
  assert.match(styles, /@media \(max-width:820px\)[\s\S]*?\.home-category-strip \{[^}]*display:block;[^}]*overflow-x:auto;[^}]*touch-action:pan-x;/);
});

test("home keeps every principal section and all category links", () => {
  for (const section of ["products", "about", "services", "maintenance", "contact"]) {
    assert.match(home, new RegExp(`id="${section}"`));
  }
  assert.match(home, /homeCategoryOrder\.map/);
  assert.match(home, /PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href/);
  assert.match(home, /<footer>/);
});

test("home remains one responsive product slider per category", () => {
  assert.match(home, /chunkProducts\(categoryProducts, homeProductGroupSize\)/);
  assert.doesNotMatch(home, /home-category-(?:desktop|mobile)-products/);
  assert.match(styles, /\.home-category-sections \{[^}]*gap:32px;/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.home-category-sections \{ gap:24px; \}/);
});

test("large vertical sections are compacted without being hidden", () => {
  assert.match(styles, /\.products-section \{ padding:20px 0 80px;/);
  assert.match(styles, /\.feature-band-inner \{[^}]*min-height:520px;/);
  assert.match(styles, /\.services \{ padding:78px 0;/);
  assert.match(styles, /\.maintenance-grid \{[^}]*min-height:480px;[^}]*padding-block:56px;/);
  assert.match(styles, /\.contact-banner-inner \{ min-height:175px;/);
  assert.doesNotMatch(styles, /(?:products-section|feature-band-inner|services|maintenance-grid)[^}]*display:none/);
});
