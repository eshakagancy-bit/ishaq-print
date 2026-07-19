import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_IMAGE_DIMENSION,
  WEBP_UPLOAD_QUALITY,
  constrainedImageSize,
  optimizeImageForUpload,
  shouldUseCompressedImage,
} from "../app/image-upload-optimizer.ts";

test("constrains the longest image edge to 1920px", () => {
  assert.deepEqual(constrainedImageSize(4000, 2000), { width: 1920, height: 960 });
  assert.deepEqual(constrainedImageSize(1200, 900), { width: 1200, height: 900 });
  assert.equal(MAX_IMAGE_DIMENSION, 1920);
});

test("uses the requested WebP upload quality", () => {
  assert.equal(WEBP_UPLOAD_QUALITY, 0.82);
});

test("keeps the original when WebP is not smaller", () => {
  assert.equal(shouldUseCompressedImage(1000, 999), true);
  assert.equal(shouldUseCompressedImage(1000, 1000), false);
  assert.equal(shouldUseCompressedImage(1000, 1100), false);
});

test("does not process animated GIF files", async () => {
  const gif = new File([Uint8Array.from([0x47, 0x49, 0x46])], "animation.gif", { type: "image/gif" });
  assert.equal(await optimizeImageForUpload(gif), gif);
});
