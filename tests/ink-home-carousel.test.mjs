import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("ink carousels never autoplay while card and quick-view controls stay interactive", async () => {
  const [home, categories, modal, carousel] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
    read("app/ink-image-carousel.tsx"),
  ]);

  assert.match(home, /product\.category === "inks" \? <InkImageCarousel[\s\S]*?variant="home-static"/);
  assert.doesNotMatch(categories, /variant="home-static"/);
  assert.match(modal, /variant="quick"/);
  assert.doesNotMatch(carousel, /setInterval|setTimeout|autoPlay|autoplay/);
  assert.match(carousel, /multiple && !staticMode/);
  assert.match(carousel, /onTouchStart=\{staticMode \? undefined/);
  assert.match(carousel, /onTouchEnd=\{staticMode \? undefined/);
  assert.match(carousel, /aria-label="الصورة السابقة"/);
  assert.match(carousel, /aria-label="الصورة التالية"/);
  assert.match(carousel, /aria-label="اختيار صورة المنتج"/);
});
