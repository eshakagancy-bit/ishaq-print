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

// Run the actual route, validation, normalization and RPC adapter; intercept
// authentication and the external boundaries so no request can reach Supabase.
function fixture() {
  const calls = [];
  const cache = new Map();
  const supabase = {
    from(table) {
      calls.push(["read", table]);
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
    async rpc(name, payload) {
      calls.push([name, payload]);
      return { data: { ...payload.p_product, product_models: [] }, error: null };
    },
  };
  const mocked = new Map([
    [resolve(root, "app/admin-auth"), { requireAdminApi: async () => true }],
    [resolve(root, "lib/indexnow"), { getIndexNowProductUrl: () => null }],
    [resolve(root, "lib/supabase-server"), { getSupabaseAdmin: () => supabase }],
  ]);
  function load(path) {
    if (mocked.has(path)) return mocked.get(path);
    const file = [path, path + ".ts", path + ".js", resolve(path, "index.ts")]
      .find((candidate) => statSync(candidate, { throwIfNoEntry: false })?.isFile());
    if (!file) throw new Error(`Missing test module: ${path}`);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
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
    route: load(resolve(root, "app/api/site/route.ts")),
    database: load(resolve(root, "lib/site-database.ts")),
    calls,
  };
}

const product = {
  id: 42, name: "Test product", category: "printers", printerCategory: "ecotank",
  image: "/printer.webp", family: "", type: "", size: "", description: "", features: [],
};
const request = (method, fields) => new Request("https://example.test/api/site", {
  method, body: JSON.stringify({ product: { ...product, ...fields } }),
  headers: { "content-type": "application/json" },
});
const json = (value) => JSON.parse(JSON.stringify(value));

test("product edits reject missing, null and non-array models before any database access", async () => {
  const { route, calls } = fixture();
  for (const fields of [{}, { models: null }, { models: {} }, { models: "[]" }, { models: [null] }]) {
    const response = await route.PATCH(request("PATCH", fields));
    assert.equal(response.status, 400, JSON.stringify(fields));
  }
  assert.deepEqual(calls, []);
});

test("product edits pass explicit empty lists and existing model/color IDs to the atomic RPC", async () => {
  const { route, calls } = fixture();
  const existing = [{ id: 12, model: "A", availability: "in_stock", sortOrder: 0, isActive: true,
    variants: [{ id: 89, color: "black", partNumber: "A1", availability: "in_stock", sortOrder: 1, isActive: true }] }];
  for (const models of [[], existing]) {
    const response = await route.PATCH(request("PATCH", { models }));
    assert.equal(response.status, 200, await response.text());
  }
  const writes = calls.filter(([name]) => name === "save_product_with_models").map(([, args]) => json(args));
  assert.equal(writes.length, 2);
  assert.equal(writes[0].p_create, false);
  assert.deepEqual(writes[0].p_models, []);
  assert.equal(writes[1].p_models[0].id, 12);
  assert.equal(writes[1].p_models[0].variants[0].id, 89);
});

test("direct updates reject omitted models while creation can still omit them", async () => {
  const { database, route, calls } = fixture();
  await assert.rejects(database.updateProduct(product));
  assert.deepEqual(calls, []);
  const response = await route.POST(request("POST", {}));
  assert.equal(response.status, 201, await response.text());
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "save_product_with_models");
  assert.equal(calls[0][1].p_create, true);
  assert.deepEqual(json(calls[0][1].p_models), []);
});
