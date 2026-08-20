import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("hero saves send only the canonical subtitle field", async () => {
  const dashboard = await read("app/admin/admin-dashboard.tsx");
  const payload = dashboard.match(/function heroSlidePayload[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(payload, /subtitle: slide\.subtitle/);
  assert.doesNotMatch(payload, /subtitle2/);
  assert.match(dashboard, /JSON\.stringify\(heroSlidePayload\(heroForm\)\)/);
  assert.doesNotMatch(dashboard, /JSON\.stringify\(heroForm\)/);
});

test("hero validation accepts legacy subtitle2 but normalizes to subtitle", async () => {
  const [validation, defaults, database, setup] = await Promise.all([
    read("app/api/admin/hero-slides/validation.ts"),
    read("app/site-defaults.ts"),
    read("lib/site-database.ts"),
    read("supabase/setup.sql"),
  ]);

  assert.match(validation, /"subtitle", "subtitle2"/);
  assert.match(validation, /subtitle: strings\.subtitle/);
  assert.match(defaults, /subtitle: string/);
  assert.match(database, /subtitle: normalizeLegacyArabicText\(slide\.subtitle\)/);
  assert.match(setup, /subtitle text not null default ''/);
  assert.doesNotMatch(`${defaults}\n${database}\n${setup}`, /subtitle2/);
});
