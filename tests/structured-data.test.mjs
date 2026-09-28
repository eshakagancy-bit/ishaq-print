import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  LOCAL_BUSINESS_ID,
  ORGANIZATION_ID,
  buildBreadcrumbStructuredData,
  buildHomeStructuredData,
  buildProductStructuredData,
  serializeStructuredData,
} from "../app/structured-data.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const product = {
  id: 99,
  name: "حبر ليزر تجريبي",
  family: "",
  image: "/products/laser.webp",
  images: ["/products/laser.webp"],
  category: "laser_inks",
  type: "ليزر",
  size: "",
  description: "حبر ليزر متوافق مع موديلات حقيقية.",
  features: [],
  inkSpecifications: {
    images: ["/products/laser.webp"],
    variants: [],
    brand: "HP",
    inkType: "ليزر",
    colorCount: null,
    colorMode: "black",
    capacities: [],
    compatiblePrinters: [],
    features: [],
    uses: [],
  },
  models: [{
    id: 1,
    model: "85A",
    partNumber: "CE285A",
    compatibility: "HP LaserJet P1102",
    availability: "in_stock",
    sortOrder: 0,
    isActive: true,
    variants: [],
  }],
};

test("home JSON-LD defines linked Organization and LocalBusiness with real profiles", () => {
  const data = buildHomeStructuredData();
  assert.equal(data["@context"], "https://schema.org");
  const graph = data["@graph"];
  assert.ok(Array.isArray(graph));
  const organization = graph.find((item) => item["@type"] === "Organization");
  const localBusiness = graph.find((item) => item["@type"] === "LocalBusiness");
  assert.equal(organization["@id"], ORGANIZATION_ID);
  assert.equal(localBusiness["@id"], LOCAL_BUSINESS_ID);
  assert.equal(localBusiness.parentOrganization["@id"], ORGANIZATION_ID);
  assert.equal(organization.name, "وكالة إسحاق العالمية");
  assert.equal(organization.alternateName, "ESHAK INTERNATIONAL AGENCY");
  assert.match(organization.logo, /^https:\/\/ishaq-print-zeta\.vercel\.app\//);
  assert.deepEqual(organization.sameAs, [
    "https://www.instagram.com/eshak_gruop_agancy",
    "https://www.facebook.com/EshakAgency",
  ]);
});

test("Product JSON-LD contains only real product and model values without commercial inventions", () => {
  const data = buildProductStructuredData({
    product,
    name: product.name,
    description: product.description,
    path: "/inks/99-laser",
    category: "أحبار الليزر",
    images: product.images,
  });
  assert.equal(data["@type"], "Product");
  assert.equal(data.name, product.name);
  assert.equal(data.url, "https://ishaq-print-zeta.vercel.app/inks/99-laser");
  assert.equal(data.model, "85A");
  assert.deepEqual(data.brand, { "@type": "Brand", name: "HP" });
  assert.ok(data.additionalProperty.some((item) => item.value === "CE285A"));
  assert.ok(data.additionalProperty.some((item) => item.value === "HP LaserJet P1102"));
  for (const forbidden of ["offers", "price", "priceCurrency", "aggregateRating", "review", "ratingValue", "gtin", "sku", "mpn"]) {
    assert.equal(Object.hasOwn(data, forbidden), false, forbidden);
  }
});

test("BreadcrumbList uses absolute URLs", () => {
  const data = buildBreadcrumbStructuredData([
    { name: "الرئيسية", path: "/" },
    { name: "أحبار الليزر", path: "/laser-inks" },
    { name: product.name, path: "/inks/99-laser" },
  ]);
  assert.equal(data["@type"], "BreadcrumbList");
  assert.deepEqual(data.itemListElement.map((item) => item.position), [1, 2, 3]);
  assert.ok(data.itemListElement.every((item) => item.item.startsWith("https://ishaq-print-zeta.vercel.app/")));
});

test("JSON-LD serialization escapes HTML-significant opening brackets", () => {
  assert.equal(serializeStructuredData({ value: "</script>" }).includes("</script>"), false);
  assert.match(serializeStructuredData({ value: "</script>" }), /\\u003c\/script>/);
});

test("all product detail pages emit Product and Breadcrumb JSON-LD", () => {
  for (const path of ["app/printers/[slug]/page.tsx", "app/inks/[slug]/page.tsx", "app/papers/[slug]/page.tsx"]) {
    const source = read(path);
    assert.match(source, /buildProductStructuredData/);
    assert.match(source, /buildBreadcrumbStructuredData/);
    assert.match(source, /jsonLdScriptProps/);
  }
});

test("laser model and compatibility content is server-rendered and visible", () => {
  const source = read("app/inks/[slug]/page.tsx");
  assert.match(source, /activeModels\.map/);
  assert.match(source, /model\.partNumber/);
  assert.match(source, /model\.compatibility/);
  assert.match(source, /موديلات أحبار الليزر والتوافق/);
  assert.doesNotMatch(source, /hidden|display:\s*none/);
});
