import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ink carousels omit pagination dots while arrows and swipe stay interactive without autoplay", async () => {
  const [home, categories, modal, carousel] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
    read("app/ink-image-carousel.tsx"),
  ]);

  assert.match(home, /isInkCategory\(product\.category\) \? <InkImageCarousel[\s\S]*?variant="home-static"/);
  assert.doesNotMatch(categories, /variant="home-static"/);
  assert.match(modal, /variant="quick"/);
  assert.doesNotMatch(carousel, /setInterval|setTimeout|autoPlay|autoplay/);
  assert.match(carousel, /multiple && !staticMode/);
  assert.match(carousel, /onTouchStart=\{staticMode \? undefined/);
  assert.match(carousel, /onTouchEnd=\{staticMode \? undefined/);
  assert.match(carousel, /aria-label="الصورة السابقة"/);
  assert.match(carousel, /aria-label="الصورة التالية"/);
  assert.doesNotMatch(carousel, /ink-carousel-dots|اختيار صورة المنتج|عرض الصورة/);
});
