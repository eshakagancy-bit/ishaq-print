import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeInkSpecifications } from "../app/ink-specifications.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ink variants normalize explicit code, label and image mappings only", () => {
  const specifications = normalizeInkSpecifications({
    images: ["/all.webp", "/cyan.webp", "/black.webp"],
    variants: [
      { code: " c ", label: "Cyan", image: "/cyan.webp" },
      { code: "BK", label: "Black", image: "/black.webp" },
      { code: "c", label: "duplicate", image: "/wrong.webp" },
      { code: "", label: "Unknown", image: "/unknown.webp" },
    ],
  });
  assert.deepEqual(specifications?.variants, [
    { code: "C", label: "Cyan", image: "/cyan.webp" },
    { code: "BK", label: "Black", image: "/black.webp" },
  ]);
});

test("legacy ink images remain intact and do not become guessed variants", () => {
  const specifications = normalizeInkSpecifications({ images: ["/group.webp", "/one.webp", "/two.webp"], colorCount: "4 ألوان" });
  assert.deepEqual(specifications?.images, ["/group.webp", "/one.webp", "/two.webp"]);
  assert.deepEqual(specifications?.variants, []);
});

test("verified UV mapping is guarded, non-destructive and reuses existing image URLs", async () => {
  const migration = await read("supabase/migrations/20260823193000_add_verified_uv_ink_variants.sql");
  assert.match(migration, /where id = 1785436371873/);
  assert.match(migration, /specifications->'images' = jsonb_build_array/);
  assert.match(migration, /'code', 'BK'/);
  assert.match(migration, /'code', 'C'/);
  assert.doesNotMatch(migration, /delete from|drop table|drop column/i);
});

test("all remaining live ink products receive explicit guarded variant mappings", async () => {
  const migration = await read("supabase/migrations/20260824163000_fix_all_ink_product_variants.sql");
  const ids = [
    1785613292781, 1785614704244, 1785614784716, 1785614841661,
    1785614888877, 1785614968465, 1785615020399, 1785615049745,
    1785615129114, 1785692107684, 1785693562090, 1785695633529,
    1786283698362, 1786284107858, 1786284579967, 1786987310455,
  ];
  ids.forEach((id) => assert.match(migration, new RegExp(`${id}::bigint`)));
  assert.match(migration, /1785614704244::bigint[\s\S]*?'code','BK'[\s\S]*?'code','C'[\s\S]*?'code','M'[\s\S]*?'code','Y'/);
  assert.match(migration, /jsonb_array_length\(coalesce\(p\.specifications->'images'/);
  assert.match(migration, /not \(p\.specifications->'images' \? \(variant->>'image'\)\)/);
  assert.match(migration, /complete_count <> 16/);
  assert.doesNotMatch(migration, /delete from|drop table|drop column/i);
});

test("admin and API require explicit unique per-product variant mappings", async () => {
  const [admin, validation] = await Promise.all([read("app/admin/admin-dashboard.tsx"), read("app/api/site/validation.ts")]);
  assert.match(admin, /ربط ألوان الحبر بالصور/);
  assert.match(admin, /اختر الصورة المؤكدة/);
  assert.match(validation, /لا يمكن تكرار كود اللون داخل منتج الحبر/);
  assert.match(validation, /safeWebOrLocalUrl\(image, "صورة لون الحبر"/);
});
