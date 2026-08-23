import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("only the first mounted hero image is high priority and other slides are not duplicated", async () => {
  const home = await read("app/home-client.tsx");
  assert.match(home, /index === activeHeroSlide \|\| index === outgoingHeroSlide/);
  assert.match(home, /priority=\{index === 0\}/);
  assert.match(home, /fetchPriority=\{index === 0 \? "high" : "auto"\}/);
  assert.doesNotMatch(home, /heroSlides\.map[\s\S]*?priority(?:\s|=)*\/?>/);
});

test("product cards reserve image space, use responsive sizes, and remain lazy", async () => {
  const [home, categories, carousel] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/ink-image-carousel.tsx"),
  ]);
  assert.match(home, /width=\{modal \? 700 : 560\}[\s\S]*?height=\{modal \? 600 : 440\}[\s\S]*?sizes=\{modal \? PRODUCT_MODAL_IMAGE_SIZES : PRODUCT_CARD_IMAGE_SIZES\}[\s\S]*?loading=\{modal \? "eager" : "lazy"\}/);
  assert.match(categories, /width=\{420\} height=\{320\} sizes="\(max-width: 700px\) 46vw, \(max-width: 1100px\) 30vw, 280px"/);
  assert.match(carousel, /loading=\{variant === "quick" \? "eager" : "lazy"\}/);
  assert.doesNotMatch(`${home}\n${categories}`, /home-category-(?:desktop|mobile)-products/);
});

test("detail gallery prioritizes only its above-fold primary image", async () => {
  const [gallery, printer, paper, ink] = await Promise.all([
    read("app/product-gallery.tsx"),
    read("app/printers/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
  ]);
  assert.match(gallery, /width=\{760\} height=\{620\} sizes="\(max-width: 800px\) 92vw, 48vw" priority/);
  assert.match(gallery, /width=\{96\} height=\{76\} sizes="76px" loading="lazy"/);
  assert.match(gallery, /width=\{1200\} height=\{960\} sizes="95vw" loading="eager"/);
  assert.doesNotMatch(`${printer}\n${paper}\n${ink}`, /eshak-logo\.png[^\n>]*priority(?:\s|=)/);
  assert.match(`${printer}\n${paper}\n${ink}`, /eshak-logo\.png[^\n>]*loading="eager" fetchPriority="low"/);
});

test("only preoptimized images bypass transformations while other formats retain Next optimization", async () => {
  const [config, image, home] = await Promise.all([
    read("next.config.ts"),
    read("app/storefront-image.tsx"),
    read("app/home-client.tsx"),
  ]);
  assert.doesNotMatch(config, /unoptimized:\s*true/);
  for (const path of ["/api/media/**", "/brand/**", "/categories/**", "/hero/**", "/products/**"]) assert.ok(config.includes(path));
  assert.doesNotMatch(config, /remotePatterns/);
  assert.match(image, /isPreoptimizedImageSource\(props\.src\)/);
  assert.match(image, /unoptimized=\{Boolean\(unoptimized \|\| preoptimized\)\}/);
  assert.match(home, /getImageProps\(\{[\s\S]*?unoptimized: isPreoptimizedImageSource\(src\)/);
});
