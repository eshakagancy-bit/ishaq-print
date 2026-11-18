import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const exec = promisify(execFile);
const testUrl = process.env.PRODUCT_SAVE_TEST_DATABASE_URL;
const migrationUrl = new URL("../supabase/migrations/20261118090000_save_product_with_models.sql", import.meta.url);

test("the fresh setup installs the same atomic product save function and grants as the migration", async () => {
  const [migration, setup] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(new URL("../supabase/setup.sql", import.meta.url), "utf8"),
  ]);
  const block = migration.slice(migration.indexOf("create or replace function"), migration.lastIndexOf("commit;")).trim();
  assert.ok(setup.replaceAll("\r\n", "\n").includes(block.replaceAll("\r\n", "\n")));
});

test("PostgreSQL saves products, models and variants atomically and rejects unauthorized callers", {
  skip: !testUrl && "Requires psql and a disposable local product save database",
}, async () => {
  const url = new URL(testUrl);
  assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname));
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  assert.match(url.pathname, /^\/ishaq_product_save_test[a-z0-9_]*$/);
  assert.equal(url.search + url.hash, "");
  const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key)));
  const env = {
    ...inheritedEnv, PGHOST: url.hostname.replace(/[\[\]]/g, ""), PGPORT: url.port || "5432",
    PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password), PGCONNECT_TIMEOUT: "3", PGCLIENTENCODING: "UTF8",
  };
  async function sql(query, role = "service_role") {
    const { stdout } = await exec("psql", [
      "-XAtq", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose",
      "-c", `set role ${role}; ${query}`,
    ], { env, timeout: 10000 }).catch(({ stderr }) => {
      const state = /ERROR:\s+(\w{5}):/.exec(stderr ?? "")?.[1];
      throw new Error(state ?? "PostgreSQL test query failed");
    });
    return stdout.trim();
  }
  const literal = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const product = (id, name) => ({
    id, name, family: "", category: "laser_inks", image: "/ink.webp", type: "", size: "",
    description: "", features: [], sort_order: 8,
  });
  const models = [{ model: "Toner A", sort_order: 4, image: "/model.webp",
    variants: [{ color: "black", part_number: "A1", sort_order: 2, image: "/black.webp" }] }];
  const call = (p, m, create = false) =>
    `select public.save_product_with_models(${literal(p)}, ${literal(m)}, ${create})`;
  const snapshot = (id) => `select jsonb_build_array(to_jsonb(p), to_jsonb(m), to_jsonb(v))
    from public.products p join public.product_models m on m.product_id=p.id
    join public.product_model_variants v on v.product_model_id=m.id where p.id=${id}`;

  // The caller must provision roles and schema on an empty disposable database first.
  assert.equal(await sql("select count(*) from public.products"), "0");
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(sql(call(product(101, "Forbidden"), models, true), role), { message: "42501" });
  }
  assert.equal(await sql("select count(*) from public.products"), "0");

  const initial = JSON.parse(await sql(call(product(101, "Initial"), models, true)));
  const [model] = initial.product_models;
  const [variant] = model.product_model_variants;
  assert.ok(model.id && variant.id);
  assert.equal(model.product_id, 101);
  assert.equal(variant.product_model_id, model.id);
  assert.equal(initial.image, "/ink.webp");
  assert.equal(model.image, "/model.webp");
  assert.equal(variant.image, "/black.webp");
  assert.equal(model.sort_order, 4);
  assert.equal(variant.sort_order, 2);
  const updatedModels = (suffix) => [{
    ...models[0], id: model.id, model: `Toner ${suffix}`,
    variants: [{ ...models[0].variants[0], id: variant.id, part_number: suffix }],
  }];

  // Force failure after an earlier model and variant have already been changed.
  const before = await sql(snapshot(101));
  await assert.rejects(sql(call(product(101, "Rolled back"), [
    ...updatedModels("Rollback"), { model: "Broken", availability: "invalid" },
  ])), { message: "23514" });
  assert.equal(await sql(snapshot(101)), before);
  await assert.rejects(sql(call(product(102, "Rolled back insert"), [
    ...models, { model: "Broken", availability: "invalid" },
  ], true)), { message: "23514" });
  assert.equal(await sql("select count(*) from public.products where id=102"), "0");

  const both = await Promise.all(["First", "Second"].map(async (label) =>
    JSON.parse(await sql(call(product(101, label), updatedModels(label))))));
  for (const saved of both) {
    const [savedModel] = saved.product_models;
    assert.equal(savedModel.model, `Toner ${saved.name}`);
    assert.equal(savedModel.id, model.id);
    assert.equal(savedModel.product_model_variants[0].id, variant.id);
    assert.equal(savedModel.product_model_variants[0].part_number, saved.name);
  }
  const [finalProduct, finalModel, finalVariant] = JSON.parse(await sql(snapshot(101)));
  assert.equal(finalModel.model, `Toner ${finalProduct.name}`);
  assert.equal(finalVariant.part_number, finalProduct.name);

  const added = await Promise.all([103, 104].map(async (id) =>
    JSON.parse(await sql(call(product(id, `New ${id}`), models, true)))));
  assert.deepEqual(added.map((p) => p.home_display_order).sort((a, b) => a - b), [1, 2]);
});
