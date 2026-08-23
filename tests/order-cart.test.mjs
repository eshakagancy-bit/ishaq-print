import assert from "node:assert/strict";
import test from "node:test";
import {
  ORDER_CART_SALES_INTERNATIONAL,
  addCartItem,
  buildOrderMessage,
  buildOrderWhatsAppUrl,
  clearCartItems,
  parseStoredCart,
  removeCartItem,
  serializeCart,
  setCartItemQuantity,
} from "../app/order-cart.ts";

const printer = { productType: "printer", productId: "p1", productName: "EPSON LQ-350", productUrl: "/printers/epson-lq-350", image: "/products/printer.webp" };
const paper = { productType: "paper", productId: "pa1", productName: "ورق SQM A4", productUrl: "/papers/sqm-a4", image: "/products/paper.webp" };
const cyan = { productType: "ink", productId: "i1", productName: "حبر SQM 500 مل", productUrl: "/inks/sqm-500", image: "/products/cyan.webp", variant: { code: "C", label: "Cyan" } };
const black = { ...cyan, image: "/products/black.webp", variant: { code: "BK", label: "Black" } };

test("cart adds printers and papers and increments duplicate products", () => {
  let items = addCartItem([], printer);
  items = addCartItem(items, paper);
  items = addCartItem(items, printer);
  items = addCartItem(items, paper);
  assert.deepEqual(items.map(({ productType, quantity }) => ({ productType, quantity })), [
    { productType: "printer", quantity: 2 },
    { productType: "paper", quantity: 2 },
  ]);
});

test("same ink color increments while different colors remain independent", () => {
  let items = addCartItem([], cyan);
  items = addCartItem(items, black);
  items = addCartItem(items, cyan);
  assert.equal(items.length, 2);
  assert.equal(items.find((item) => item.variant?.code === "C")?.quantity, 2);
  assert.equal(items.find((item) => item.variant?.code === "BK")?.quantity, 1);
  assert.equal(items.find((item) => item.variant?.code === "C")?.image, "/products/cyan.webp");
  assert.equal(items.find((item) => item.variant?.code === "BK")?.image, "/products/black.webp");
});

test("generic ink cannot be added without an explicit color", () => {
  assert.throws(() => addCartItem([], { ...cyan, variant: undefined }), /require a color variant/);
});

test("quantity controls preserve minimum one and removal and clear stay explicit", () => {
  let items = addCartItem([], printer);
  items = setCartItemQuantity(items, items[0].key, 3);
  assert.equal(items[0].quantity, 3);
  items = setCartItemQuantity(items, items[0].key, 1);
  assert.equal(items[0].quantity, 1);
  assert.equal(setCartItemQuantity(items, items[0].key, 0)[0].quantity, 1);
  assert.deepEqual(removeCartItem(items, items[0].key), []);
  assert.deepEqual(clearCartItems(), []);
});

test("versioned localStorage data restores safely and corrupted data falls back empty", () => {
  const items = addCartItem(addCartItem([], printer), cyan);
  assert.deepEqual(parseStoredCart(serializeCart(items)), items);
  assert.deepEqual(parseStoredCart("not-json"), []);
  assert.deepEqual(parseStoredCart(JSON.stringify({ version: 99, items })), []);
  assert.deepEqual(parseStoredCart(JSON.stringify({ version: 1, items: [{ productType: "ink" }] })), []);
});

test("WhatsApp order uses sales recipient, variants, quantities and product links without commerce fields", () => {
  const items = [
    ...addCartItem([], { ...printer, quantity: 1 }),
    ...addCartItem([], { ...paper, quantity: 3 }),
    ...addCartItem([], { ...cyan, quantity: 2 }),
  ];
  const origin = "https://ishaq-print-zeta.vercel.app";
  const message = buildOrderMessage(items, origin);
  const url = buildOrderWhatsAppUrl(items, origin);
  assert.equal(ORDER_CART_SALES_INTERNATIONAL, "967774666202");
  assert.match(url, /^https:\/\/wa\.me\/967774666202\?text=/);
  assert.match(message, /EPSON LQ-350[\s\S]*الكمية: 1/);
  assert.match(message, /ورق SQM A4[\s\S]*الكمية: 3/);
  assert.match(message, /حبر SQM 500 مل[\s\S]*اللون: Cyan \(C\)[\s\S]*الكمية: 2/);
  assert.match(message, /https:\/\/ishaq-print-zeta\.vercel\.app\/inks\/sqm-500/);
  assert.doesNotMatch(message, /السعر:|الإجمالي|الضريبة|الشحن|الرقم المرجعي|reference/i);
});
