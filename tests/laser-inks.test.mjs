import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { addCartItem, removeCartItem, setCartItemQuantity } from "../app/order-cart.ts";
import { activeModelVariants, isInkCategory, laserInkColorLabel, selectModelVariant } from "../app/laser-inks.ts";
import { searchProducts } from "../app/global-product-search.ts";

const blackItem = {
  productType: "ink",
  productId: "1788286346249",
  productName: "حبر HP LaserJet أسود",
  productUrl: "/inks/hp-laserjet-black?model=HP%2078A",
  image: "/products/hp.webp",
  model: { id: "101", name: "HP 78A", partNumber: "CE278A" },
  color: { code: "black", label: "أسود" },
};

const colorProduct = {
  id: 9001,
  category: "laser_inks",
  name: "Test Laser Color",
  brand: "HP",
  models: [{
    id: 201, model: "HP 410A", partNumber: undefined, compatibility: "HP Color LaserJet",
    availability: "on_request", sortOrder: 1, isActive: true,
    variants: [
      { id: 301, productModelId: 201, color: "black", partNumber: "CF410A", availability: "in_stock", sortOrder: 0, isActive: true },
      { id: 302, productModelId: 201, color: "cyan", partNumber: "CF411A", availability: "in_stock", sortOrder: 1, isActive: true },
      { id: 303, productModelId: 201, color: "yellow", partNumber: "CF412A", availability: "in_stock", sortOrder: 2, isActive: true },
      { id: 304, productModelId: 201, color: "magenta", partNumber: "CF413A", availability: "out_of_stock", sortOrder: 3, isActive: true },
    ],
  }],
};

test("laser inks are an independent admin category but remain in the public ink scope", () => {
  assert.equal(isInkCategory("inks"), true);
  assert.equal(isInkCategory("laser_inks"), true);
  assert.equal(isInkCategory("papers"), false);
  assert.equal(laserInkColorLabel("cyan"), "سماوي");
});

test("black laser models merge by product and model while different models stay separate", () => {
  let items = addCartItem([], { ...blackItem, quantity: 2 });
  items = addCartItem(items, { ...blackItem, quantity: 1 });
  assert.equal(items.length, 1);
  assert.equal(items[0].quantity, 3);
  assert.equal(items[0].model.partNumber, "CE278A");
  assert.equal(items[0].color.label, "أسود");

  items = addCartItem(items, { ...blackItem, productUrl: "/inks/hp-laserjet-black?model=HP%2005A", model: { id: "121", name: "HP 05A", partNumber: "CE505A" } });
  assert.equal(items.length, 2);
  items = setCartItemQuantity(items, items[1].key, 4);
  assert.equal(items[1].quantity, 4);
  assert.equal(removeCartItem(items, items[1].key).length, 1);
});

test("colored variants expose the correct part numbers, availability and cart identity", () => {
  const variants = activeModelVariants(colorProduct.models[0]);
  assert.equal(selectModelVariant(variants, "black").partNumber, "CF410A");
  assert.equal(selectModelVariant(variants, "cyan").partNumber, "CF411A");
  assert.equal(selectModelVariant(variants, "yellow").partNumber, "CF412A");
  assert.equal(selectModelVariant(variants, "magenta").availability, "out_of_stock");

  const base = { productType: "ink", productId: "9001", productName: "Test Laser Color", productUrl: "/inks/test-laser-color", image: "/products/color.webp", model: { id: "201", name: "HP 410A" } };
  let items = addCartItem([], { ...base, quantity: 2, color: { id: "302", code: "cyan", label: "سماوي" }, model: { ...base.model, partNumber: "CF411A" } });
  items = addCartItem(items, { ...base, quantity: 1, color: { id: "302", code: "cyan", label: "سماوي" }, model: { ...base.model, partNumber: "CF411A" } });
  items = addCartItem(items, { ...base, color: { id: "303", code: "yellow", label: "أصفر" }, model: { ...base.model, partNumber: "CF412A" } });
  assert.deepEqual(items.map((item) => [item.color.code, item.quantity]), [["cyan", 3], ["yellow", 1]]);
});

test("search finds laser products by model, model part number and variant part number", () => {
  const values = (product) => [product.name, product.brand, ...product.models.flatMap((model) => [model.model, model.partNumber, ...model.variants.flatMap((variant) => [variant.partNumber, variant.color])])];
  assert.equal(searchProducts([colorProduct], "HP 410A", "inks", values).length, 1);
  assert.equal(searchProducts([colorProduct], "CF411A", "inks", values).length, 1);
  assert.equal(searchProducts([colorProduct], "cyan", "inks", values).length, 1);
});

test("the variant migration is additive, constrained, indexed and closed to public writes", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260902090000_add_laser_ink_variants.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.product_model_variants/);
  assert.match(sql, /references public\.product_models\(id\) on delete cascade/);
  assert.match(sql, /product_model_variants_model_color_ci_uidx/);
  assert.match(sql, /lower\(btrim\(color\)\)/);
  assert.match(sql, /alter table public\.product_model_variants enable row level security/);
  assert.match(sql, /revoke all on table public\.product_model_variants from anon, authenticated/);
  assert.match(sql, /create or replace function public\.sync_product_models/);
  assert.doesNotMatch(sql, /drop\s+(table|column)|truncate|delete from public\.products|update public\.products/i);
});

test("admin supports black and colored laser inks without a laser model price field", async () => {
  const [admin, validation] = await Promise.all([
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/site/validation.ts", import.meta.url), "utf8"),
  ]);
  assert.match(admin, /\[LASER_INK_CATEGORY, "أحبار الليزر"\]/);
  assert.match(admin, /<legend>مواصفات أحبار الليزر<\/legend>/);
  assert.match(admin, /LASER_INK_COLOR_MODES\.map/);
  assert.match(admin, /colorMode === "black"/);
  assert.match(admin, /colorMode === "color"/);
  assert.match(admin, /\{!laserInk && <label>السعر الاختياري/);
  assert.match(admin, /\+ إضافة لون/);
  assert.match(admin, /حذف اللون/);
  assert.match(validation, /لا يمكن تكرار اللون داخل نفس الموديل/);
  assert.match(validation, /يجب إضافة لون واحد على الأقل لكل موديل حبر ليزر ملون/);
});

test("storefront model, color, quantity and unavailable-state behavior is wired accessibly", async () => {
  const [selector, details, card, styles] = await Promise.all([
    readFile(new URL("../app/laser-ink-model-selector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/inks/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product-model-chips.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(details, /<LaserInkModelSelector/);
  assert.match(details, /requestedColor=\{requestedColor\}/);
  assert.match(selector, /requestedColor\?: string/);
  assert.match(selector, /availability === "out_of_stock"/);
  assert.match(selector, /disabled=\{unavailable\}/);
  assert.match(selector, /aria-label="اختيار لون حبر الليزر"/);
  assert.match(selector, /setQuantity\(\(value\) => Math\.max\(1/);
  assert.match(selector, /selectedVariant\?\.image \|\| selectedModel\.image \|\| productImage/);
  assert.match(card, /models\.slice\(0, limit\)/);
  assert.match(card, /\+\{models\.length - limit\}/);
  assert.match(styles, /@media \(max-width:600px\)[\s\S]*?\.laser-color-options \{ grid-template-columns:1fr; \}/);
});

test("database and API load variants in one nested query and preserve model ids on sync", async () => {
  const [database, route] = await Promise.all([
    readFile(new URL("../lib/site-database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/site/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(database, /product_models\(\*, product_model_variants\(\*\)\)/);
  assert.match(database, /rpc\("sync_product_models"/);
  assert.match(database, /id: model\.id/);
  assert.match(route, /variants: Array\.isArray\(model\.variants\)/);
  assert.match(route, /isLaserInkCategory\(category\) \? undefined/);
});
