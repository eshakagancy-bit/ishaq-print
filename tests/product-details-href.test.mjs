import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getProductDetailsHref } from "../app/product-details-href-core.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("getProductDetailsHref routes each product category to its canonical details path", () => {
  const printer = { id: 101, name: "Epson EcoTank L3250", category: "printers" };
  const standardInk = { id: 202, name: "Epson 103 EcoTank Black", category: "inks" };
  const laserInk = { id: 1788629545462, name: "Canon", category: "laser_inks" };
  const paper = { id: 404, name: "Glossy Photo Paper A4", category: "papers" };

  // Printers route to /printers/[slug]
  assert.equal(getProductDetailsHref(printer), "/printers/101-epson-ecotank-l3250");

  // Standard inks route to /inks/[slug]
  assert.equal(getProductDetailsHref(standardInk), "/inks/202-epson-103-ecotank-black");

  // Laser inks MUST route to /inks/[slug] and NEVER to /printers/[slug] or /papers/[slug]
  assert.equal(getProductDetailsHref(laserInk), "/inks/1788629545462-canon");
  assert.notEqual(getProductDetailsHref(laserInk), "/printers/1788629545462-canon");
  assert.notEqual(getProductDetailsHref(laserInk), "/papers/1788629545462-canon");

  // Papers route to /papers/[slug]
  assert.equal(getProductDetailsHref(paper), "/papers/404-glossy-photo-paper-a4");
});

test("home page wires all product cards, search, favorites and quick-view correctly for laser inks", async () => {
  const home = await read("app/home-client.tsx");

  // Uses unified helper
  assert.match(home, /import\s*\{\s*getProductDetailsHref\s*\}\s*from\s*"\.\/product-details-href"/);
  assert.match(home, /const\s+detailsHref\s*=\s*getProductDetailsHref\(product\)/);

  // Quick view handles isInkCategory before falling back to papers
  assert.match(
    home,
    /detailsHref=\{selected\.category === "printers" \? `\/printers\/\$\{getPrinterSlug\(selected\)\}` : isInkCategory\(selected\.category\) \? `\/inks\/\$\{getInkSlug\(selected\)\}` : `\/papers\/\$\{getPaperSlug\(selected\)\}`\}/
  );

  // Quick view unification regression assertions remain intact
  assert.match(home, /`\/printers\/\$\{getPrinterSlug\(selected\)\}`/);
  assert.match(home, /`\/inks\/\$\{getInkSlug\(selected\)\}`/);
  assert.match(home, /`\/papers\/\$\{getPaperSlug\(selected\)\}`/);
});

test("global search drawer imports and uses shared getProductDetailsHref", async () => {
  const searchDrawer = await read("app/global-search-drawer.tsx");
  assert.match(searchDrawer, /import\s*\{\s*getProductDetailsHref\s*\}\s*from\s*"\.\/product-details-href"/);
  assert.match(searchDrawer, /const\s+productDetailsHref\s*=\s*getProductDetailsHref/);
});

test("category products client routes laser inks to /inks/[slug]", async () => {
  const categoryClient = await read("app/category-products-client.tsx");
  assert.match(categoryClient, /detailsHref=\{`\/\$\{isInkCategory\(selected\.category\) \? "inks" : category\}\/\$\{productSlug\(selected\)\}`\}/);
  assert.match(categoryClient, /`\/\$\{isInkCategory\(product\.category\) \? "inks" : category\}\/\$\{productSlug\(product\)\}`/);
});
