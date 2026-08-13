import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { PAPER_SPECIFICATIONS_UPDATE_TARGETS } from "../lib/paper-specifications-update.ts";
import { getInkProductNameError } from "../app/ink-specifications.ts";

async function sourceFiles(directory) {
  const entries = await readdir(new URL(directory, import.meta.url), { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const url = new URL(`${directory}${entry.name}${entry.isDirectory() ? "/" : ""}`, import.meta.url);
    if (entry.isDirectory()) return sourceFiles(`${directory}${entry.name}/`);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [url] : [];
  }));
  return files.flat();
}

test("uses the unified Arabic Epson spelling in public application sources", async () => {
  const files = [
    ...await sourceFiles("../app/"),
    ...await sourceFiles("../lib/"),
  ];
  const sources = await Promise.all(files.map(async (url) => ({ url, content: await readFile(url, "utf8") })));

  for (const { url, content } of sources) {
    assert.doesNotMatch(content, /ابسون/, url.pathname);
  }
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /طابعات إبسون/);
  assert.match(layout, /طباعة إبسون/);
});

test("keeps QM and SQM as distinct paper brands", () => {
  const names = PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target) => target.name);
  const qmNames = names.filter((name) => name.startsWith("QM "));
  const sqmNames = names.filter((name) => name.startsWith("SQM "));

  assert.deepEqual(qmNames, [
    "QM ROCK5 Double Side Matte Paper 120gsm",
    "QM Inkjet High Glossy Photo Paper 180gsm",
    "QM ROCK5 Inkjet Matte Paper 108gsm",
    "QM Premium RC Glossy Photo Paper 260gsm",
  ]);
  assert.deepEqual(sqmNames, ["SQM Sublimation Transfer Paper A4 125gsm – 100 Sheets"]);
  assert.equal(qmNames.some((name) => name.startsWith("SQM ")), false);
  assert.equal(sqmNames.some((name) => /^QM /.test(name)), false);
});

test("keeps current printer ids, official models and derived slugs unchanged", async () => {
  const defaults = await readFile(new URL("../app/site-defaults.ts", import.meta.url), "utf8");
  const expected = [
    [1, "Epson WorkForce Pro EM-C800RDWF"],
    [2, "EPSON WorkForce Pro WF-C579R"],
    [3, "EPSON WorkForce Pro WF-C5390"],
    [4, "EPSON WorkForce Pro WF-C878R"],
    [5, "EPSON WorkForce Pro WF-C879R"],
    [6, "EPSON WorkForce Pro WF-C869R"],
    [7, "Epson WorkForce Pro EM-C800RDWF + Tray"],
  ];

  for (const [id, name] of expected) {
    assert.match(defaults, new RegExp(`id: ${id}, name: "${name.replace(/[+]/g, "\\+")}"`));
  }

  const slugSources = await Promise.all(["printers", "papers", "inks"].map((category) =>
    readFile(new URL(`../app/${category}/product-slug.ts`, import.meta.url), "utf8")));
  assert.match(slugSources[0], /return `\$\{product\.id\}-\$\{name \|\| "printer"\}`/);
  assert.match(slugSources[1], /if \(existingSlug\) return existingSlug/);
  assert.match(slugSources[2], /return `\$\{product\.id\}-\$\{name \|\| "ink"\}`/);
});

test("keeps standardized ink names, capacities and technical names intact", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260804_standardize_ink_product_names.sql", import.meta.url), "utf8");
  const rows = [...migration.matchAll(/\(\d+,\s*'[^']+',\s*'([^']+)',\s*array\[([^\]]+)]::text\[]\)/g)];

  assert.equal(rows.length, 13);
  for (const [, name, rawCapacities] of rows) {
    const capacities = [...rawCapacities.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.match(name, /^حبر /);
    assert.equal(getInkProductNameError(name, capacities), null, name);
    for (const capacity of capacities) assert.ok(name.includes(capacity), `${name}: ${capacity}`);
  }
  assert.match(migration, /حبر DTF 500 مل/);
  assert.match(migration, /حبر Pigment 500 مل/);
  assert.match(migration, /حبر Dye 0005 1000 مل/);
});
