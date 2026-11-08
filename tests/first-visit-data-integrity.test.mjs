import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public routes never silently swallow database errors or substitute starter products", async () => {
  const publicPages = [
    "app/page.tsx",
    "app/categories/page.tsx",
    "app/printers/page.tsx",
    "app/inks/page.tsx",
    "app/papers/page.tsx",
    "app/laser-inks/page.tsx",
    "app/maintenance/page.tsx",
    "app/printers/[slug]/page.tsx",
    "app/inks/[slug]/page.tsx",
    "app/papers/[slug]/page.tsx",
  ];

  for (const pagePath of publicPages) {
    const content = await read(pagePath);
    assert.doesNotMatch(
      content,
      /starterProducts/,
      `${pagePath} must not fall back to obsolete starterProducts`,
    );
    assert.doesNotMatch(
      content,
      /catch\s*\(\s*\(\s*\)\s*=>\s*\(?\{\s*(?:products|settings)/,
      `${pagePath} must not silently catch database errors with default data`,
    );
  }
});

test("home client does not substitute starterProducts when initialProducts is empty", async () => {
  const homeClient = await read("app/home-client.tsx");
  assert.doesNotMatch(homeClient, /starterProducts/);
  assert.match(homeClient, /const \[products\] = useState<Product\[\]>\(\(\) => initialProducts\.map/);
});

test("site database incorporates retry resilience and avoids unconditional seeding queries", async () => {
  const database = await read("lib/site-database.ts");
  assert.match(database, /function withDatabaseRetry/);
  assert.match(database, /withDatabaseRetry\(async \(\) =>/);
  assert.match(database, /function isTransientDatabaseError/);
  assert.match(database, /siteDefaultsEnsured/);
  assert.match(database, /heroDefaultsEnsured/);
});

test("site database reader functions perform pure read operations without mutations or recursive upserts", async () => {
  const database = await read("lib/site-database.ts");
  const getHomeSection = database.slice(database.indexOf("export async function getHomeData"), database.indexOf("export async function getProductById"));
  const getSiteSection = database.slice(database.indexOf("export async function getSiteData"), database.indexOf("export async function getSitemapProducts"));
  const getHeroSection = database.slice(database.indexOf("export async function getHeroData"), database.indexOf("export async function createHeroSlide"));

  for (const [name, section] of [["getHomeData", getHomeSection], ["getSiteData", getSiteSection], ["getHeroData", getHeroSection]]) {
    assert.doesNotMatch(section, /ensure(?:Site|Hero)Defaults/, `${name} must not trigger seeding mutations`);
    assert.doesNotMatch(section, /\.(?:upsert|insert|update|delete)\(/, `${name} must not execute database mutations`);
  }
});
