import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeMediaStoragePath,
  mediaUrlFromStoragePath,
  normalizeMediaUrl,
  safeMediaStoragePath,
  supabasePublicMediaStoragePath,
} from "../lib/media-url.ts";

test("normalizes legacy Supabase public media URLs", () => {
  assert.equal(
    normalizeMediaUrl("https://project-ref.supabase.co/storage/v1/object/public/site-media/banners/hero%20image.webp?version=1"),
    "/api/media/banners/hero%20image.webp",
  );
  assert.equal(
    normalizeMediaUrl("https://project-ref.supabase.co/storage/v1/object/public/custom-media/logos/logo.png", "custom-media"),
    "/api/media/logos/logo.png",
  );
});

test("leaves local and unrelated image URLs unchanged", () => {
  const local = "/products/printer.png";
  const external = "https://images.example.com/printer.png";
  const otherBucket = "https://project-ref.supabase.co/storage/v1/object/public/other-bucket/printer.png";

  assert.equal(normalizeMediaUrl(local), local);
  assert.equal(normalizeMediaUrl(external), external);
  assert.equal(normalizeMediaUrl(otherBucket), otherBucket);
});

test("builds proxy URLs without changing the storage path", () => {
  assert.equal(mediaUrlFromStoragePath("products/file name.png"), "/api/media/products/file%20name.png");
  assert.equal(safeMediaStoragePath(["products", "file name.png"]), "products/file name.png");
});

test("rejects direct and encoded path traversal", () => {
  assert.equal(safeMediaStoragePath(["products", "..", "file.png"]), null);
  assert.equal(safeMediaStoragePath(["products", "%252e%252e", "file.png"]), null);
  assert.equal(decodeMediaStoragePath("products/%2e%2e/file.png"), null);
  assert.equal(decodeMediaStoragePath("products/%252fsecret.png"), null);

  const rawTraversal = "https://project-ref.supabase.co/storage/v1/object/public/site-media/products/%2e%2e/secret.png";
  assert.equal(supabasePublicMediaStoragePath(rawTraversal), null);
  assert.equal(normalizeMediaUrl(rawTraversal), rawTraversal);
});
