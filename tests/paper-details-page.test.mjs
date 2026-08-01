import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("paper cards and details use the shared site data with safe slugs and Next.js 404", async () => {
  const [page, home, slug] = await Promise.all([
    readFile(new URL("../app/papers/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/papers/product-slug.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /getSiteData\(\)/);
  assert.match(page, /if \(!product\) notFound\(\)/);
  assert.match(page, /buildPaperSpecificationRows\(product\)/);
  assert.match(page, /product\.images\?\.length/);
  assert.match(page, /منتجات ورقية مشابهة/);
  assert.match(home, /window\.location\.href = `\/papers\/\$\{getPaperSlug\(product\)\}`/);
  assert.match(slug, /product\.slug\?\.trim\(\)/);
  assert.match(slug, /`\$\{product\.id\}-\$\{name \|\| "paper"\}`/);
});
