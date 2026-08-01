import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("defines one optional category image for every current UI card", async () => {
  const defaults = await read("app/site-defaults.ts");
  const definitions = defaults.match(/export const categoryImageDefinitions = \[([\s\S]+?)\] as const;/)?.[1] ?? "";
  const keys = [...definitions.matchAll(/\{ key: "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(keys, [
    "printers", "laptops", "engraving-presses", "inks", "papers", "advertising-machines",
    "electronics", "cameras", "3d-printers", "money-machines", "networks", "all-products",
  ]);
  assert.match(defaults, /categoryImageDefinitions\.map\(\(\{ key \}\) => \[key, ""\]\)/);
});

test("stores category images in site settings and normalizes every media URL", async () => {
  const [defaults, route, database] = await Promise.all([
    read("app/site-defaults.ts"),
    read("app/api/site/route.ts"),
    read("lib/site-database.ts"),
  ]);
  assert.match(defaults, /categoryImages:\s*CategoryImages/);
  assert.match(route, /categoryImages:\s*normalizeCategoryImages\(input\.categoryImages, bucket\)/);
  assert.match(route, /normalizeMediaUrl\(input\[key\]\.trim\(\)\.slice\(0, 2000\), bucket\)/);
  assert.match(database, /categoryImages:\s*Object\.fromEntries/);
  assert.match(database, /normalizeStoredMediaUrl\(normalizedText\.categoryImages\?\.\[key\] \?\? ""\)/);
});

test("reuses the existing upload lifecycle without touching product records", async () => {
  const [admin, uploadRoute, home] = await Promise.all([
    read("app/admin/admin-dashboard.tsx"),
    read("app/api/upload/route.ts"),
    read("app/home-client.tsx"),
  ]);
  assert.match(admin, /صور الفئات/);
  assert.match(admin, /uploadImage\(event, value, \(url\) => updateCategoryImage\(key, url\), "general"\)/);
  assert.match(admin, /removeImage\(value, \(\) => updateCategoryImage\(key, ""\)\)/);
  assert.match(admin, /\.\.\.Object\.values\(nextSettings\.categoryImages\)/);
  assert.match(uploadRoute, /uploadImage\(file, requestedFolder\)/);
  assert.doesNotMatch(home, /categories-view|categoryVisuals|allProductsVisual/);
  assert.doesNotMatch(admin.match(/const updateCategoryImage[\s\S]+?\n  };/)?.[0] ?? "", /setProducts|productForm/);
});
