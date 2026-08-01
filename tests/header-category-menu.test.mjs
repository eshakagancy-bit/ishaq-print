import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the header category dropdown uses only the centrally enabled public categories", async () => {
  const [home, styles, publicCategories] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/public-categories.ts", import.meta.url), "utf8"),
  ]);

  assert.match(publicCategories, /PUBLIC_ENABLED_CATEGORIES\s*=\s*\[\s*"printers",\s*"inks",\s*"papers",?\s*\]/s);
  assert.match(home, /PUBLIC_ENABLED_CATEGORIES\.includes\(category\)/);
  assert.match(home, /headerCategoryLinks\.map/);
  assert.match(home, /<Link key=\{item\.category\} href=\{item\.href\}/);
  assert.match(home, /aria-expanded=\{categoriesMenuOpen\}/);
  assert.match(home, /aria-controls="header-category-menu"/);
  assert.match(home, /aria-haspopup="true"/);
  assert.match(home, /document\.addEventListener\("mousedown", closeOnOutsideClick\)/);
  assert.match(home, /event\.key !== "Escape"/);
  assert.match(home, /setCategoriesMenuOpen\(false\); setMenuOpen\(false\)/);
  const headerLinksDefinition = home.slice(home.indexOf("const headerCategoryLinks"), home.indexOf("function isCategoryId"));
  assert.doesNotMatch(headerLinksDefinition, /laptops|cameras|networks|money-machines|3d-printers/);
  assert.match(styles, /\.header-category-menu \{ position:absolute; z-index:70;/);
  assert.match(styles, /\.header-category-trigger:focus-visible,\.header-category-menu a:focus-visible/);
  assert.match(styles, /\.header-category-menu \{ position:static; width:100%; max-width:none;/);
});
