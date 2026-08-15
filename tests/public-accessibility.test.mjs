import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public layout provides a visible-on-focus skip link and a focusable main target", async () => {
  const [layout, home, category, styles] = await Promise.all([
    read("app/layout.tsx"),
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(layout, /className="skip-link" href="#main-content">تجاوز إلى المحتوى/);
  assert.match(home, /<main id="main-content" tabIndex=\{-1\}/);
  assert.match(category, /<main id="main-content" tabIndex=\{-1\}/);
  assert.match(styles, /\.skip-link:focus\s*\{[^}]*translateY\(0\)/);
  assert.match(styles, /:focus-visible\s*\{[^}]*outline:/);
});

test("navigation, filters, sliders and favorites expose state to assistive technology", async () => {
  const [home, category] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
  ]);
  assert.match(home, /aria-controls="site-menu-drawer" aria-expanded=\{menuOpen\}/);
  assert.match(home, /if \(event\.key === "Escape"\)[\s\S]*?setActiveHeaderDrawer\("closed"\)/);
  assert.match(home, /role="dialog" aria-modal=\{menuOpen \? "true" : undefined\} aria-hidden=\{!menuOpen\} inert=\{!menuOpen\}/);
  assert.match(home, /#site-menu-drawer \.drawer-close/);
  assert.match(home, /menuButton\?\.focus\(\)/);
  assert.match(home, /role="region"[\s\S]*?tabIndex=\{0\}[\s\S]*?aria-label=\{`منتجات \$\{label\}، مرر أفقيًا لعرض المزيد`\}/);
  assert.doesNotMatch(home, /inert=\{index !== activeGroup\} aria-hidden=\{index !== activeGroup\}/);
  assert.match(home, /aria-pressed=\{favorites\.includes\(product\.id\)\}/);
  assert.match(category, /aria-pressed=\{printerFilter === item\.value\}/);
  assert.match(category, /aria-pressed=\{favorites\.includes\(product\.id\)\}/);
});

test("quick view and favorites dialogs manage focus and close from Escape", async () => {
  const [home, modal] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/quick-view-modal.tsx"),
  ]);
  for (const source of [home, modal]) {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /aria-labelledby=/);
    assert.match(source, /event\.key === "Escape"/);
    assert.match(source, /event\.key !== "Tab"/);
  }
  assert.match(home, /favoritesCloseRef\.current\?\.focus\(\)/);
  assert.match(home, /favoritesButton\?\.focus\(\)/);
  assert.match(modal, /closeRef\.current\?\.focus\(\)/);
  assert.match(modal, /trigger\?\.isConnected/);
});

test("hero autoplay and scripted scrolling respect reduced motion", async () => {
  const home = await read("app/home-client.tsx");
  const usesReducedMotion = home.match(/prefers-reduced-motion: reduce/g) ?? [];
  assert.ok(usesReducedMotion.length >= 2);
});
