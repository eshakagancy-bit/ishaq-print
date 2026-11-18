import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const plain = (value) => JSON.parse(JSON.stringify(value));

function fixture(rows, cap = 1000) {
  const calls = [];
  const modules = new Map();
  const supabase = {
    from(table) {
      assert.equal(table, "products");
      const filters = [];
      const sorts = [];
      return {
        select(fields, options) { this.fields = fields; this.options = options; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        neq(key, value) { filters.push([key, value, "neq"]); return this; },
        in(key, values) { filters.push([key, values, "in"]); return this; },
        order(key) { sorts.push(key); return this; },
        async maybeSingle() {
          calls.push({ fields: this.fields, filters });
          return { data: rows.find((row) => row.id === filters[0][1]) ?? null, error: null };
        },
        async range(from, to) {
          calls.push({ fields: this.fields, filters, sorts, from, to });
          const matches = rows.filter((row) => filters.every(([key, values, op]) =>
            op === "in" ? values.includes(row[key]) : op === "neq" ? row[key] !== values : true));
          return { data: matches.slice(from, Math.min(to + 1, from + cap)),
            count: this.options?.count === "exact" ? matches.length : null, error: null };
        },
      };
    },
  };
  function load(path) {
    if (path === resolve(root, "lib/supabase-server")) return { getSupabaseAdmin: () => supabase };
    const file = [path, path + ".ts", path + ".js", resolve(path, "index.ts")]
      .find((candidate) => statSync(candidate, { throwIfNoEntry: false })?.isFile());
    assert.ok(file, `Missing test module: ${path}`);
    if (modules.has(file)) return modules.get(file);
    const exports = {};
    modules.set(file, exports);
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    vm.runInNewContext(outputText, {
      exports, Request, Response, URL, AbortSignal, process: { env: {} },
      require: (name) => name.startsWith(".") ? load(resolve(dirname(file), name)) : require(name),
    }, { filename: file });
    return exports;
  }
  return {
    calls,
    detail: load(resolve(root, "lib/product-details-data")).getProductDetails,
    sitemap: load(resolve(root, "lib/site-database")).getSitemapProducts,
    search: load(resolve(root, "app/api/product-search/route.ts")).GET,
  };
}

const row = (id, name = "Sample toner") => ({
  id, name, category: "laser_inks", image: "/toner.webp", type: "", family: "",
  description: "", sort_order: id, specifications: { colorMode: "color" },
  product_models: [{ id: 9, product_id: id, model: "M1", is_active: true, sort_order: 0,
    product_model_variants: [{ id: 11, product_model_id: 9, color: "cyan",
      part_number: "C11", image: "/cyan.webp", is_active: true, sort_order: 0 }] }],
});

test("detail fetch uses the ID, retains nested colors, and validates section and canonical slug", async () => {
  const f = fixture([row(7)]);
  const product = await f.detail("inks", "7-sample-toner");
  assert.equal(product.models[0].variants[0].image, "/cyan.webp");
  assert.deepEqual(plain(f.calls[0].filters), [["id", 7]]);
  assert.match(f.calls[0].fields, /product_models\(\*, product_model_variants\(\*\)\)/);
  assert.equal(await f.detail("inks", "no-id"), null);
  assert.equal(await f.detail("inks", "9007199254740992-toner"), null);
  assert.equal(f.calls.length, 1);
  for (const [section, slug] of [["inks", "8-sample-toner"], ["inks", "7-wrong"], ["papers", "7-sample-toner"]]) {
    assert.equal(await f.detail(section, slug), null);
  }
});

test("search and sitemap read all pages even when the backend caps results below the requested page size", async () => {
  const f = fixture([row(1), row(2), row(3), row(4), row(5), { ...row(6), category: "laptops" }], 2);
  const response = await f.search();
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.deepEqual(data.map((p) => p.id), [1, 2, 3, 4, 5]);
  assert.equal(data[4].models[0].variants[0].partNumber, "C11");
  assert.equal(data[4].models[0].variants[0].image, undefined);
  assert.deepEqual(plain(await f.sitemap()).map((p) => p.id), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plain(f.calls.map(({ from, sorts }) => [from, sorts])), [
    [0, ["sort_order", "id"]], [2, ["sort_order", "id"]], [4, ["sort_order", "id"]],
    [0, ["id"]], [2, ["id"]], [4, ["id"]],
  ]);
});

test("subsequent reads observe changed catalog data and do not reuse a previous search response", async () => {
  const rows = [row(7)];
  const f = fixture(rows);
  assert.equal((await f.detail("inks", "7-sample-toner")).name, "Sample toner");
  assert.equal((await (await f.search()).json())[0].name, "Sample toner");
  rows[0] = row(7, "Updated toner");
  assert.equal(await f.detail("inks", "7-sample-toner"), null);
  assert.equal((await f.detail("inks", "7-updated-toner")).name, "Updated toner");
  assert.equal((await (await f.search()).json())[0].name, "Updated toner");
});
