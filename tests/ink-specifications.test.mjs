import assert from "node:assert/strict";
import test from "node:test";
import {
  INK_COLOR_COUNT_OPTIONS,
  buildInkSpecificationRows,
  normalizeInkSpecifications,
} from "../app/ink-specifications.ts";

test("uses only the supported ink set color-count options", () => {
  assert.deepEqual([...INK_COLOR_COUNT_OPTIONS], ["4 ألوان", "5 ألوان", "6 ألوان", "أخرى"]);
});

test("normalizes and displays the ink set color count", () => {
  const inkSpecifications = normalizeInkSpecifications({ colorCount: "5 ألوان" });
  assert.equal(inkSpecifications?.colorCount, "5 ألوان");
  assert.deepEqual(buildInkSpecificationRows({ inkSpecifications }), [
    { key: "color-count", label: "عدد الألوان", value: "5 ألوان" },
  ]);
});

test("loads legacy ink specifications without treating a color name as a count", () => {
  const inkSpecifications = normalizeInkSpecifications({ color: "سماوي", brand: "Epson" });
  assert.ok(inkSpecifications);
  assert.equal(inkSpecifications.colorCount, null);
  assert.deepEqual(buildInkSpecificationRows({ inkSpecifications }), [
    { key: "brand", label: "العلامة التجارية", value: "Epson" },
  ]);
});

test("rejects unsupported color-count values", () => {
  assert.equal(normalizeInkSpecifications({ colorCount: "7 ألوان" })?.colorCount, null);
});
