import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AdminValidationError,
  enumValue,
  positiveInteger,
  safeWebOrLocalUrl,
  strictBoolean,
  strictObject,
  strictStringArray,
} from "../app/api/admin-validation.ts";

test("strict admin validation accepts allowlisted payloads and rejects mass assignment", () => {
  assert.deepEqual(strictObject({ id: 7, name: "منتج" }, ["id", "name"], "المنتج"), { id: 7, name: "منتج" });
  assert.throws(() => strictObject({ id: 7, isAdmin: true }, ["id"], "المنتج"), AdminValidationError);
  assert.throws(() => strictObject({ id: 7, createdAt: "now" }, ["id"], "المنتج"), AdminValidationError);
});

test("strict admin primitives reject wrong types, invalid enums, arrays, ids, and urls", () => {
  assert.doesNotThrow(() => {
    positiveInteger(10, "id");
    strictBoolean(true, "active");
    enumValue("printers", ["printers", "papers"], "category");
    strictStringArray(["A4", "A3+"], "sizes", 5, 20);
    safeWebOrLocalUrl("/products/image.webp", "image");
    safeWebOrLocalUrl("https://example.com/image.webp", "image");
  });
  assert.throws(() => positiveInteger("10", "id"), AdminValidationError);
  assert.throws(() => strictBoolean("true", "active"), AdminValidationError);
  assert.throws(() => enumValue("invalid", ["printers"], "category"), AdminValidationError);
  assert.throws(() => strictStringArray("A4", "sizes", 5, 20), AdminValidationError);
  assert.throws(() => safeWebOrLocalUrl("javascript:alert(1)", "image"), AdminValidationError);
});

test("all state-changing admin routes apply an explicit allowlist or empty-body contract", async () => {
  const files = await Promise.all([
    "../app/api/site/route.ts",
    "../app/api/upload/route.ts",
    "../app/api/admin/hero-slides/validation.ts",
    "../app/api/admin/home-product-order/route.ts",
    "../app/api/admin/login/route.ts",
    "../app/api/admin/logout/route.ts",
    "../app/api/admin/paper-specifications-update/route.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  const source = files.join("\n");
  assert.match(files[0], /validateSettingsPayload\(await request\.json\(\)\)/);
  assert.match(files[0], /validateProductPayload\(await request\.json\(\)\)/);
  assert.match(files[0], /validateDeletePayload\(await request\.json\(\)\)/);
  assert.match(files[1], /strictObject\(await request\.json\(\), \["url"\]/);
  assert.match(files[2], /strictObject\(value, slideKeys/);
  assert.match(files[3], /strictObject\(entry, \["id", "category", "homeDisplayOrder"\]/);
  assert.match(source, /request\.text\(\)/);
  assert.doesNotMatch(files[0], /normalizeProduct\(\(await request\.json\(\)/);
});
