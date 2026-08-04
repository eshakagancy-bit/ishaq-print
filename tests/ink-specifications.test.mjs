import assert from "node:assert/strict";
import test from "node:test";
import {
  INK_COLOR_COUNT_OPTIONS,
  buildInkSpecificationRows,
  getInkProductNameError,
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

test("requires singular ink names with every selected capacity", () => {
  for (const name of [
    "حبر Dye 100 مل",
    "حبر Dye 100مل",
    "حبر Dye 100 ML",
    "حبر Dye 100ML",
    "حبر Dye 100 ml",
    "حبر Dye 100ml",
    "حبر Dye 100 Ml",
    "حبر Dye 100 mL",
  ]) {
    assert.equal(getInkProductNameError(name, ["100 مل"]), null, name);
  }
  assert.equal(getInkProductNameError("حبر Pigment 500 مل / 1000 ML", ["500 مل", "1000 مل"]), null);
  assert.equal(getInkProductNameError("حبر Dye 70ml / 250 مل / 500 mL", ["70 مل", "250 مل", "500 مل"]), null);
  assert.match(getInkProductNameError("أحبار Pigment 500 مل", ["500 مل"]), /«حبر»/);
  assert.match(getInkProductNameError("حبر Pigment", ["500 مل"]), /«مل» أو «ML»/);
  assert.match(getInkProductNameError("حبر Pigment 500 ML", ["500 مل", "1000 مل"]), /«مل» أو «ML»/);
  assert.match(getInkProductNameError("حبر Pigment 500 مل / 1000ML", ["500 مل"]), /«مل» أو «ML»/);
  assert.match(getInkProductNameError("أفضل حبر Pigment 500 مل", ["500 مل"]), /«حبر»/);
  assert.match(getInkProductNameError("حبر Pigment Premium 500 مل", ["500 مل"]), /تسويقية/);
});
