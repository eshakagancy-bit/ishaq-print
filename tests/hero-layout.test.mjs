import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Hero uses a responsive 16:9 stage without fixed responsive heights", async () => {
  const styles = await read("app/globals.css");
  const heroRules = [...styles.matchAll(/\.hero-slider\s*\{([^}]*)\}/g)].map((match) => match[1]);

  assert.ok(heroRules.length > 0);
  for (const rule of heroRules) {
    assert.match(rule, /aspect-ratio:16\/9/);
    assert.match(rule, /height:auto/);
    assert.match(rule, /min-height:0/);
    assert.doesNotMatch(rule, /height:(?:clamp\(|\d+px)/);
  }
  assert.match(styles, /\.hero-slide-image\s*\{[^}]*object-fit:contain;[^}]*object-position:center;/);
});

test("Hero admin recommends and previews the adopted 2048 by 1152 WebP format", async () => {
  const [admin, styles] = await Promise.all([
    read("app/admin/admin-dashboard.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(admin, /المقاس الموصى به: 2048 × 1152 بكسل — نسبة 16:9 — WebP/);
  assert.match(styles, /\.hero-slide-form \.real-image-field img \{[^}]*height:auto;[^}]*aspect-ratio:16\/9;[^}]*object-fit:contain;/);
  assert.match(styles, /\.hero-slides-row img \{[^}]*height:auto;[^}]*aspect-ratio:16\/9;[^}]*object-fit:contain;/);
});

test("Hero keeps selective preoptimized-image bypass instead of disabling optimization globally", async () => {
  const [hero, wrapper, config] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/storefront-image.tsx"),
    read("next.config.ts"),
  ]);

  assert.match(hero, /import Image from "\.\/storefront-image"/);
  assert.match(wrapper, /isPreoptimizedImageSource/);
  assert.match(wrapper, /unoptimized=\{Boolean\(unoptimized \|\| preoptimized\)\}/);
  assert.doesNotMatch(config, /unoptimized\s*:\s*true/);
});
