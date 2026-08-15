import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const footer = home.match(/<footer>[\s\S]*?<\/footer>/)?.[0] ?? "";

test("footer exposes only the official Facebook and Instagram links", () => {
  assert.match(footer, /href="https:\/\/www\.facebook\.com\/EshakAgency"/);
  assert.match(footer, /href="https:\/\/www\.instagram\.com\/eshak_gruop_agancy"/);
  assert.equal((footer.match(/className="footer-social-links"/g) ?? []).length, 1);
  assert.doesNotMatch(footer, /twitter\.com|x\.com|tiktok\.com|youtube\.com|linkedin\.com/);
});

test("footer social links open safely and remain accessible", () => {
  const socialLinks = footer.match(/<a href="https:\/\/www\.(?:facebook|instagram)\.com\/[^"]+"[\s\S]*?<\/a>/g) ?? [];
  assert.equal(socialLinks.length, 2);
  for (const link of socialLinks) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
    assert.match(link, /aria-label="(?:Facebook|Instagram) - وكالة إسحاق العالمية"/);
    assert.match(link, /<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">/);
  }
});
