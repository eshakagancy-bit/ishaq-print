import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_HOST,
  INDEXNOW_KEY,
  INDEXNOW_KEY_LOCATION,
  buildIndexNowPayload,
  getIndexNowProductUrl,
  submitIndexNowUrls,
  submitIndexNowUrlsSafely,
} from "../lib/indexnow.ts";

const siteUrl = "https://ishaq-print-zeta.vercel.app";

test("IndexNow key and verification file are valid and identical", async () => {
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{64}$/);
  assert.equal(INDEXNOW_KEY_LOCATION, `${siteUrl}/${INDEXNOW_KEY}.txt`);
  assert.equal((await readFile(new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url), "utf8")).trim(), INDEXNOW_KEY);
});

test("builds the official payload with the production host and key location", () => {
  const url = `${siteUrl}/printers/42-epson-l3250`;
  assert.deepEqual(buildIndexNowPayload(url), {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: [url],
  });
  assert.equal(INDEXNOW_HOST, "ishaq-print-zeta.vercel.app");
});

test("maps supported product categories to their real public routes", () => {
  assert.equal(getIndexNowProductUrl({ id: 1, name: "Epson L3250", category: "printers" }), `${siteUrl}/printers/1-epson-l3250`);
  assert.equal(getIndexNowProductUrl({ id: 2, name: "Epson 003", category: "inks" }), `${siteUrl}/inks/2-epson-003`);
  assert.equal(getIndexNowProductUrl({ id: 3, name: "HP 85A", category: "laser_inks" }), `${siteUrl}/inks/3-hp-85a`);
  assert.equal(getIndexNowProductUrl({ id: 4, name: "Premium A4", category: "papers", slug: "premium-a4" }), `${siteUrl}/papers/premium-a4`);
  assert.equal(getIndexNowProductUrl({ id: 5, name: "Hidden", category: "admin" }), null);
});

test("posts one or many deduplicated URLs without making a real request", async () => {
  const calls = [];
  const first = `${siteUrl}/inks/2-epson-003`;
  const second = `${siteUrl}/papers/4-premium-a4`;
  const mockFetch = async (input, init) => {
    calls.push({ input, init });
    return { ok: true, status: 202 };
  };
  const result = await submitIndexNowUrls([first, first, second], mockFetch);
  assert.deepEqual(result, { submitted: true, urlList: [first, second], status: 202 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, INDEXNOW_ENDPOINT);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers["content-type"], "application/json; charset=utf-8");
  assert.deepEqual(JSON.parse(calls[0].init.body), buildIndexNowPayload([first, second]));
});

test("does not submit admin URLs or URLs from another origin", async () => {
  let calls = 0;
  const mockFetch = async () => {
    calls += 1;
    return { ok: true, status: 200 };
  };
  const result = await submitIndexNowUrls([
    `${siteUrl}/admin/products`,
    "https://example.com/printers/1-test",
  ], mockFetch);
  assert.deepEqual(result, { submitted: false, urlList: [] });
  assert.equal(calls, 0);
});

test("an IndexNow failure is contained and cannot fail the completed product operation", async () => {
  const errors = [];
  const result = await submitIndexNowUrlsSafely(
    `${siteUrl}/printers/42-epson-l3250`,
    async () => { throw new Error("network unavailable"); },
    { error: (...args) => errors.push(args) },
  );
  assert.deepEqual(result, { submitted: false, urlList: [] });
  assert.equal(errors.length, 1);
});

test("product API notifies only after successful create, update, and delete calls", async () => {
  const source = await readFile(new URL("../app/api/site/route.ts", import.meta.url), "utf8");
  assert.match(source, /await createProduct\(product\);\s*await notifyIndexNow\(\[savedProduct\]\)/);
  assert.match(source, /await getProductById\(product\.id\);\s*const savedProduct = await updateProduct\(product\);\s*await notifyIndexNow\(\[previousProduct, savedProduct\]\)/);
  assert.match(source, /await removeProduct\(id\);\s*await notifyIndexNow\(\[deletedProduct\]\)/);
  assert.doesNotMatch(source, /\/admin\/.*submitIndexNow/);
});
