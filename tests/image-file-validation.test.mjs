import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_IMAGE_UPLOAD_BYTES,
  detectImageMimeType,
  fileHasMatchingImageSignature,
  isSupportedImageMimeType,
} from "../lib/image-file-validation.ts";

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
});

test("keeps the final image upload limit at 4MB", () => {
  assert.equal(MAX_IMAGE_UPLOAD_BYTES, 4 * 1024 * 1024);
});
