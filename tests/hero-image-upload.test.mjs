import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("hero image upload completes before a slide can be saved", async () => {
  const dashboard = await read("app/admin/admin-dashboard.tsx");

  assert.match(dashboard, /uploadImage\(event, heroForm\.imageUrl,[\s\S]*?"banners"\)/);
  assert.match(dashboard, /if \(uploadingImage\)[\s\S]*?return;/);
  assert.match(dashboard, /if \(!heroForm\.imageUrl\.trim\(\)\)[\s\S]*?return;/);
  assert.match(dashboard, /type="submit" disabled=\{heroSaving \|\| uploadingImage\}/);
  assert.match(dashboard, /body: JSON\.stringify\(heroSlidePayload\(heroForm\)\)/);
});

test("hero uploads retain the supported image allowlist and show the uploaded thumbnail", async () => {
  const dashboard = await read("app/admin/admin-dashboard.tsx");

  assert.match(dashboard, /accept="image\/jpeg,image\/png,image\/webp,image\/gif"/);
  assert.match(dashboard, /normalizeMediaUrl\(slide\.imageUrl\)/);
  assert.match(dashboard, /pendingUploadedMedia\.current\.add\(uploadedUrl\)/);
});

test("new slide insert recovers from a stale identity sequence without changing existing ids", async () => {
  const database = await read("lib/site-database.ts");

  assert.match(database, /result\.error\.code === "23505"/);
  assert.match(database, /order\("id", \{ ascending: false \}\)\.limit\(1\)\.maybeSingle\(\)/);
  assert.match(database, /insert\(\{ id: nextId, \.\.\.row \}\)/);
  assert.match(database, /export async function updateHeroSlide/);
  assert.match(database, /export async function removeHeroSlide/);
});

test("hero API distinguishes invalid input from storage or database failures", async () => {
  const [createRoute, itemRoute] = await Promise.all([
    read("app/api/admin/hero-slides/route.ts"),
    read("app/api/admin/hero-slides/[id]/route.ts"),
  ]);

  for (const route of [createRoute, itemRoute]) {
    assert.match(route, /validationResponse\(error\)/);
    assert.match(route, /status: 500/);
  }
  assert.match(createRoute, /console\.error\("Hero slide insert failed", error\)/);
});
