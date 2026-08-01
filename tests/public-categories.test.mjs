import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public categories are centrally limited without filtering the shared admin API", async () => {
  const [config, page, home, api, admin] = await Promise.all([
    readFile(new URL("../app/public-categories.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/site/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(config, /PUBLIC_ENABLED_CATEGORIES\s*=\s*\[\s*"printers",\s*"inks",\s*"papers",?\s*\]/s);
  assert.match(page, /siteData\.products\.filter\(\(product\) => isPublicCategoryEnabled\(product\.category\)\)/);
  assert.match(page, /heroData\.slides\.filter/);
  assert.match(page, /isPublicCategoryUrl\(slide\.primaryButtonUrl\)/);
  assert.match(home, /allCategories\.filter\(\(category\) => isPublicCategoryEnabled\(category\.id\)\)/);
  assert.doesNotMatch(api, /products:\s*data\.products\.filter/);
  assert.doesNotMatch(admin, /isPublicCategoryEnabled|PUBLIC_ENABLED_CATEGORIES/);
  assert.match(admin, /categories\.map\(\(\[value, label\]\)/);
});

test("all public product detail routes enforce the central category setting", async () => {
  const pages = await Promise.all([
    "../app/printers/[slug]/page.tsx",
    "../app/inks/[slug]/page.tsx",
    "../app/papers/[slug]/page.tsx",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  for (const page of pages) assert.match(page, /isPublicCategoryEnabled\("(?:printers|inks|papers)"\)/);
  for (const page of pages) assert.match(page, /notFound\(\)/);
});
