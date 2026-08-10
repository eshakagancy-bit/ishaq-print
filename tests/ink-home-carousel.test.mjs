import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("home ink cards keep a static image while other ink carousels stay interactive", async () => {
  const [home, categories, modal, carousel] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
    read("app/ink-image-carousel.tsx"),
  ]);

  assert.match(home, /product\.category === "inks" \? <InkImageCarousel[\s\S]*?variant="home-static"/);
  assert.doesNotMatch(categories, /variant="home-static"/);
  assert.match(modal, /variant="quick"/);
  assert.match(carousel, /variant !== "card"/);
  assert.match(carousel, /multiple && !staticMode/);
  assert.match(carousel, /onTouchStart=\{staticMode \? undefined/);
  assert.match(carousel, /onTouchEnd=\{staticMode \? undefined/);
});
