import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the custom Arabic 404 remains lightweight and links home", async () => {
  const page = await read("app/not-found.tsx");
  assert.match(page, /الصفحة غير موجودة/);
  assert.match(page, /href="\/"/);
  assert.match(page, /dir="rtl"/);
  assert.doesNotMatch(page, /HomeClient|carousel|product-card|stack|digest/);
});

test("all public product details use the shared custom not-found page", async () => {
  const pages = await Promise.all([
    read("app/printers/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
  ]);
  for (const page of pages) {
    assert.match(page, /import \{ notFound \} from "next\/navigation"/);
    assert.match(page, /if \(!product\) notFound\(\)/);
  }
});

test("the route error boundary offers retry and home without exposing internals", async () => {
  const page = await read("app/error.tsx");
  assert.match(page, /^"use client"/);
  assert.match(page, /onClick=\{reset\}>إعادة المحاولة/);
  assert.match(page, /href="\/"/);
  assert.match(page, /role="alert"/);
  assert.doesNotMatch(page, /\{error\.message\}|\{error\.stack\}|\{error\.digest\}/);
});

test("404 and error layouts stay bounded on narrow screens", async () => {
  const styles = await read("app/globals.css");
  assert.match(styles, /\.not-found-page \{[^}]*min-height:100vh;[^}]*padding:24px;/);
  assert.match(styles, /\.not-found-card \{[^}]*width:min\(620px,100%\)/);
  assert.match(styles, /\.error-page-actions \{[^}]*flex-wrap:wrap/);
});

test("public API failures do not expose provider exception details", async () => {
  const [site, hero] = await Promise.all([
    read("app/api/site/route.ts"),
    read("app/api/hero-slides/route.ts"),
  ]);
  assert.doesNotMatch(site.slice(site.indexOf("export async function GET"), site.indexOf("export async function PUT")), /error instanceof Error \? error\.message/);
  assert.doesNotMatch(hero, /error instanceof Error \? error\.message/);
});
