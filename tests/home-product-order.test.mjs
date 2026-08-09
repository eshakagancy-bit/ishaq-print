import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildHomeProductOrder,
  homeProductsForCategory,
  moveHomeProduct,
} from "../app/home-product-order.ts";

function product(id, category, homeDisplayOrder, sortOrder = id) {
  return {
    id,
    name: `${category}-${id}`,
    family: "",
    image: "/brand/eshak-logo.png",
    category,
    type: "",
    size: "",
    description: "",
    features: [],
    sortOrder,
    ...(homeDisplayOrder === undefined ? {} : { homeDisplayOrder }),
  };
}

const initialProducts = [
  product(1, "printers", 0),
  product(2, "printers", 1),
  product(3, "papers", 0),
  product(4, "papers", 1),
  product(5, "inks", 0),
  product(6, "inks", 1),
  product(7, "services", undefined),
];

test("each home category can be reordered without changing another category", () => {
  for (const [category, movedId, expected] of [
    ["printers", 1, [2, 1]],
    ["papers", 3, [4, 3]],
    ["inks", 5, [6, 5]],
  ]) {
    const moved = moveHomeProduct(initialProducts, category, movedId, 1);
    assert.deepEqual(homeProductsForCategory(moved, category).map(({ id }) => id), expected);

    for (const otherCategory of ["printers", "papers", "inks"].filter((value) => value !== category)) {
      assert.deepEqual(
        homeProductsForCategory(moved, otherCategory).map(({ id }) => id),
        homeProductsForCategory(initialProducts, otherCategory).map(({ id }) => id),
      );
    }
    assert.equal(moved.find(({ id }) => id === 7), initialProducts.find(({ id }) => id === 7));
  }
});

test("saved order remains stable after reload and missing orders stay last", () => {
  const moved = moveHomeProduct(initialProducts, "papers", 3, 1);
  const payload = buildHomeProductOrder(moved);
  const persistedById = new Map(payload.map((item) => [item.id, item.homeDisplayOrder]));
  const reloaded = [...moved].reverse().map((item) => ({
    ...item,
    homeDisplayOrder: persistedById.get(item.id),
  }));

  assert.deepEqual(homeProductsForCategory(reloaded, "papers").map(({ id }) => id), [4, 3]);

  const withLegacyProducts = [
    product(10, "inks", undefined, 8),
    product(11, "inks", 0, 99),
    product(12, "inks", undefined, 3),
  ];
  assert.deepEqual(homeProductsForCategory(withLegacyProducts, "inks").map(({ id }) => id), [11, 12, 10]);
});

test("a new product assigned after the current maximum appears at the end", () => {
  const papers = [product(20, "papers", 0), product(21, "papers", 1)];
  const maximum = Math.max(...papers.map(({ homeDisplayOrder }) => homeDisplayOrder));
  const withNewProduct = [...papers, product(22, "papers", maximum + 1, 0)];

  assert.deepEqual(homeProductsForCategory(withNewProduct, "papers").map(({ id }) => id), [20, 21, 22]);
});

test("homepage, admin API, and public category pages use the intended independent data paths", async () => {
  const [homePage, database, adminRoute, admin, migration, setup, ...categoryPages] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/home-product-order/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260809_add_home_product_order.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/setup.sql", import.meta.url), "utf8"),
    ...["printers", "papers", "inks"].map((category) =>
      readFile(new URL(`../app/${category}/page.tsx`, import.meta.url), "utf8")),
  ]);

  assert.match(homePage, /getHomeData\(\)/);
  assert.match(database, /\.order\("home_display_order", \{ ascending: true, nullsFirst: false \}\)/);
  assert.match(database, /Math\.max\(\.\.\.currentOrders\)[\s\S]*?\+ 1/);
  assert.match(adminRoute, /requireAdminApi/);
  assert.match(adminRoute, /revalidatePath\("\/"\)/);
  assert.match(admin, /ترتيب الواجهة الرئيسية/);
  assert.match(admin, /\/api\/admin\/home-product-order/);
  assert.match(admin, /HOME_PRODUCT_CATEGORIES\.map/);

  for (const categoryPage of categoryPages) {
    assert.match(categoryPage, /getSiteData\(\)/);
    assert.doesNotMatch(categoryPage, /getHomeData/);
  }

  for (const sql of [migration, setup]) {
    assert.match(sql, /home_display_order integer/);
    assert.match(sql, /create or replace function public\.set_home_product_order/);
    assert.match(sql, /set home_display_order = item\.home_display_order/);
    assert.match(sql, /revoke all on function public\.set_home_product_order/);
  }
  assert.match(migration, /add column if not exists home_display_order integer/);
  assert.match(migration, /partition by case[\s\S]*?order by sort_order, id/);
  assert.doesNotMatch(migration, /drop table|truncate table/i);
});
