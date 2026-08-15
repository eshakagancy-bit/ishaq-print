import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const services = home.match(/<section className="services"[\s\S]*?<\/section>/)?.[0] ?? "";

test("services use four unified decorative SVG icons without legacy glyphs", () => {
  for (const glyph of ["▣", "↯", "◉", "◇"]) assert.doesNotMatch(services, new RegExp(glyph));
  assert.equal((services.match(/<ServiceIcon name=/g) ?? []).length, 4);
  for (const name of ["consultation", "setup", "maintenance", "delivery"]) {
    assert.match(services, new RegExp(`<ServiceIcon name="${name}"`));
  }
  assert.match(home, /<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">/);
  assert.match(styles, /\.service-icon svg \{ width:30px; height:30px; fill:none; stroke:currentColor; stroke-width:1\.6; stroke-linecap:round; stroke-linejoin:round; \}/);
  assert.doesNotMatch(services, /<span>0[1-4]<\/span>/);
});

test("service copy and ordering remain unchanged", () => {
  const titles = ["استشارات قبل الشراء", "تجهيز وتركيب", "صيانة ودعم فني", "توصيل آمن وسريع"];
  let previous = -1;
  for (const title of titles) {
    const position = services.indexOf(title);
    assert.ok(position > previous);
    previous = position;
  }
  assert.match(services, /لماذا وكالة إسحاق؟/);
  assert.doesNotMatch(services, /خدمة متكاملة لقطاع الأعمال/);
});
