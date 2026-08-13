import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_IMAGE_UPLOAD_BYTES,
  detectImageMimeType,
  fileHasMatchingImageSignature,
  isSupportedImageMimeType,
  verifiedImageMimeType,
} from "../lib/image-file-validation.ts";
import { imageStoragePath } from "../lib/image-storage-path.ts";

test("detects supported image signatures", () => {
  assert.equal(detectImageMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectImageMimeType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectImageMimeType(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), "image/gif");
  assert.equal(detectImageMimeType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), "image/webp");
});

test("rejects unsupported or misleading image metadata", () => {
  assert.equal(detectImageMimeType(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])), null);
  assert.equal(isSupportedImageMimeType("image/svg+xml"), false);
  assert.equal(isSupportedImageMimeType("image/png"), true);
});

test("matches the declared MIME type against the file bytes", async () => {
  const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(await fileHasMatchingImageSignature(new File([pngBytes], "image.png", { type: "image/png" })), true);
  assert.equal(await fileHasMatchingImageSignature(new File([pngBytes], "image.jpg", { type: "image/jpeg" })), false);
  assert.equal(await verifiedImageMimeType(new File([pngBytes], "../ignored.exe.png", { type: "image/png" })), "image/png");
  assert.equal(await verifiedImageMimeType(new File([Uint8Array.from([0x4d, 0x5a])], "fake.png", { type: "image/png" })), null);
});

test("accepts real JPEG, PNG and WebP signatures", async () => {
  const files = [
    new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])], "photo.jpg", { type: "image/jpeg" }),
    new File([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "photo.png", { type: "image/png" }),
    new File([Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])], "photo.webp", { type: "image/webp" }),
  ];
  assert.deepEqual(await Promise.all(files.map(verifiedImageMimeType)), ["image/jpeg", "image/png", "image/webp"]);
});

test("storage paths ignore original names and use verified extensions", () => {
  const first = imageStoragePath("../products", "image/jpeg", "11111111-1111-4111-8111-111111111111");
  const second = imageStoragePath("../products", "image/jpeg", "22222222-2222-4222-8222-222222222222");
  assert.equal(first, "products/11111111-1111-4111-8111-111111111111.jpg");
  assert.equal(second, "products/22222222-2222-4222-8222-222222222222.jpg");
  assert.notEqual(first, second);
  assert.doesNotMatch(first, /\.\.|ignored|exe/);
});

test("keeps the final image upload limit at 4MB", () => {
  assert.equal(MAX_IMAGE_UPLOAD_BYTES, 4 * 1024 * 1024);
});
