import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicMetadata, SITE_URL } from "../app/seo.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("public metadata contains canonical, Open Graph and Twitter values", () => {
  const metadata = publicMetadata({ title: "اختبار", description: "وصف فعلي", path: "/printers" });
  assert.equal(SITE_URL, "https://ishaq-print-zeta.vercel.app");
  assert.equal(metadata.alternates.canonical, "/printers");
  assert.equal(metadata.openGraph.url, "/printers");
  assert.equal(metadata.openGraph.title, "اختبار");
  assert.equal(metadata.twitter.card, "summary_large_image");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});

test("main and category metadata mention only published categories", () => {
  const sources = ["app/layout.tsx", "app/printers/page.tsx", "app/papers/page.tsx", "app/inks/page.tsx"]
    .map(read).join("\n");
  for (const published of ["الطابعات", "الأوراق", "الأحبار"]) assert.match(sources, new RegExp(published));
  for (const unpublished of ["لابتوبات", "شبكات", "كاميرات", "أجهزة إلكترونية"]) assert.doesNotMatch(sources, new RegExp(unpublished));
});

test("product metadata is dynamic and uses real product content", () => {
  for (const source of ["app/printers/[slug]/page.tsx", "app/papers/[slug]/page.tsx", "app/inks/[slug]/page.tsx"].map(read)) {
    assert.match(source, /generateMetadata/);
    assert.match(source, /product\.description/);
    assert.match(source, /publicMetadata/);
  }
});

test("sitemap contains public lists and products but never admin", () => {
  const sitemap = read("app/sitemap.ts");
  for (const path of ["/categories", "/printers", "/papers", "/inks"]) assert.match(sitemap, new RegExp(path));
  assert.match(sitemap, /getPrinterSlug/);
  assert.match(sitemap, /getPaperSlug/);
  assert.match(sitemap, /getInkSlug/);
  assert.doesNotMatch(sitemap, /["'`]\/admin/);
});

test("robots blocks admin and no commercial schema is invented", () => {
  assert.match(read("app/robots.ts"), /disallow: \["\/admin"/);
  const application = ["app/layout.tsx", "app/page.tsx", "app/seo.ts"].map(read).join("\n");
  assert.doesNotMatch(application, /AggregateRating|offers|priceCurrency|availability/);
});

test("tested public page shells expose exactly one intentional h1", () => {
  const home = read("app/home-client.tsx");
  const lists = read("app/category-products-client.tsx");
  const categories = read("app/categories/page.tsx");
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.equal((lists.match(/<h1\b/g) || []).length, 1);
  assert.equal((categories.match(/<h1\b/g) || []).length, 1);
});
