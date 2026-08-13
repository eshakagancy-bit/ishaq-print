import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("collection cards keep one commercial CTA while homepage tiles stay lightweight", async () => {
  const [home, categoryClient] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
  ]);

  const homeCard = home.match(/<div className="product-body">[\s\S]*?<\/article>/)?.[0] ?? "";
  const categoryCard = categoryClient.match(/<article className="category-product-row"[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.doesNotMatch(homeCard, /product-footer|اعرف السعر والتوفر|target="_blank"/);
  assert.match(homeCard, /product-category-line/);
  assert.match(categoryCard, /<div className="category-product-actions"><a href=\{whatsappLink\(product\)\}[^>]*>اعرف السعر والتوفر<\/a><\/div>/);
  assert.equal((homeCard.match(/target="_blank"/g) ?? []).length, 0);
  assert.equal((categoryCard.match(/target="_blank"/g) ?? []).length, 1);
  assert.doesNotMatch(homeCard, />اطلب من المختص<\/a>/);
  assert.doesNotMatch(categoryCard, />اطلب من المختص<\/a>/);
});

test("printers, papers and inks keep their specialist WhatsApp route and non-commercial actions", async () => {
  const [home, categoryClient, categoryTests] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    Promise.all(["printers", "papers", "inks"].map((category) => readFile(new URL(`../app/${category}/page.tsx`, import.meta.url), "utf8"))),
  ]);

  for (const [index, category] of ["printers", "papers", "inks"].entries()) {
    assert.match(categoryTests[index], new RegExp(`category="${category}"`));
  }
  assert.match(categoryClient, /https:\/\/wa\.me\/967778989866\?text=/);
  for (const category of ["printers", "papers", "inks"]) {
    assert.match(home, new RegExp(`${category}: "967778989866"`));
  }
  assert.match(categoryClient, /className=\{favorites\.includes\(product\.id\) \? "heart active" : "heart"\}/);
  assert.match(categoryClient, />تفاصيل سريعة<\/span>/);
  assert.match(categoryClient, /detailsHref=\{`\/\$\{category\}\/\$\{productSlug\(selected\)\}`\}/);
  assert.match(home, /className=\{favorites\.includes\(product\.id\) \? "heart active" : "heart"\}/);
  assert.match(home, />تفاصيل سريعة<\/span>/);
});
