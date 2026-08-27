import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildProductCardCartAction } from "../app/order-cart.ts";

const base = {
  productId: "42",
  productName: "منتج تجريبي",
  productUrl: "/printers/42-product",
  image: "/products/example.webp",
};

test("printer and paper card actions add one product directly", () => {
  for (const category of ["printers", "papers"]) {
    const action = buildProductCardCartAction({ ...base, category });
    assert.equal(action.kind, "add");
    assert.equal(action.item.productType, category === "printers" ? "printer" : "paper");
    assert.equal(action.item.quantity, undefined);
    assert.equal(action.item.variant, undefined);
  }
});

test("ink cards without color choices add the full set directly", () => {
  const action = buildProductCardCartAction({ ...base, category: "inks", productUrl: "/inks/42-product", inkVariantCount: 0 });
  assert.equal(action.kind, "add");
  assert.deepEqual(action.item.variant, { code: "SET", label: "المجموعة الكاملة" });
});

test("ink cards with verified variants require product option selection", () => {
  const action = buildProductCardCartAction({ ...base, category: "inks", productUrl: "/inks/42-product", inkVariantCount: 4 });
  assert.deepEqual(action, { kind: "choose-options", href: "/inks/42-product" });
});

test("home and collection cards use the same cart control beside favorites", async () => {
  const [home, collection, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  for (const source of [home, collection]) {
    assert.match(source, /<ProductCardCartButton/);
    assert.match(source, /inkVariantCount=\{product\.inkSpecifications\?\.variants\.length\}/);
    assert.match(source, /className=\{favorites\.includes\(product\.id\) \? "heart active" : "heart"\}/);
  }
  assert.match(styles, /\.product-card-cart \{ position:absolute; z-index:6; top:12px; right:12px;/);
  assert.match(styles, /\.product-card-cart-feedback \{ position:fixed;/);
});
