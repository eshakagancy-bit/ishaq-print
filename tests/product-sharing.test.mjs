import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildProductShareMessage, buildWhatsAppShareUrl } from "../app/product-sharing.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all product detail routes render the shared ProductShare component with their real route", async () => {
  const details = [
    ["app/printers/[slug]/page.tsx", "product.name", "printers"],
    ["app/inks/[slug]/page.tsx", "product.name", "inks"],
    ["app/papers/[slug]/page.tsx", "title", "papers"],
  ];

  for (const [path, name, route] of details) {
    const source = await read(path);
    assert.ok(source.includes(`<ProductShare productName={${name}} productUrl={\`/${route}/\${slug}\`} referenceNumber={product.referenceNumber} />`));
  }
});

test("WhatsApp sharing encodes the real product name and production-safe URL", () => {
  const productName = "EPSON LQ-350";
  const productUrl = "https://ishaq-print-zeta.vercel.app/printers/1-epson-lq-350";
  const message = buildProductShareMessage(productName, productUrl, "PR-001");
  const shareUrl = buildWhatsAppShareUrl(productName, productUrl, "PR-001");

  assert.equal(message, `شاهد هذا المنتج:\n${productName}\nالرقم المرجعي: PR-001\nرابط المنتج:\n${productUrl}`);
  assert.equal(shareUrl, `https://wa.me/?text=${encodeURIComponent(message)}`);
  assert.match(decodeURIComponent(shareUrl), /EPSON LQ-350/);
  assert.match(decodeURIComponent(shareUrl), /الرقم المرجعي: PR-001/);
  assert.match(decodeURIComponent(shareUrl), /ishaq-print-zeta\.vercel\.app\/printers\/1-epson-lq-350/);
  assert.doesNotMatch(shareUrl, /localhost|967778989866/);
});

test("WhatsApp sharing omits the reference line when a product has no reference", () => {
  const message = buildProductShareMessage("منتج قديم", "https://example.com/products/old");
  assert.equal(message, "شاهد هذا المنتج:\nمنتج قديم\nرابط المنتج:\nhttps://example.com/products/old");
  assert.doesNotMatch(message, /الرقم المرجعي/);
});

test("share menu copies the resolved product URL and supports close and accessibility behavior", async () => {
  const component = await read("app/product-share.tsx");
  assert.match(component, /navigator\.clipboard\?\.writeText/);
  assert.match(component, /copyWithFallback\(resolvedUrl\)/);
  assert.match(component, /تم نسخ الرابط/);
  assert.match(component, /new URL\(productUrl, window\.location\.origin\)\.href/);
  assert.match(component, /document\.addEventListener\("pointerdown", closeFromOutside\)/);
  assert.match(component, /event\.key !== "Escape"/);
  assert.match(component, /aria-expanded=\{open\}/);
  assert.match(component, /aria-controls=\{menuId\}/);
  assert.match(component, /role="menuitem"/);
  assert.match(component, /event\.key === " "/);
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noopener noreferrer"/);
});
