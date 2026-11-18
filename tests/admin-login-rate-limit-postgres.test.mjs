import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const testUrl = process.env.ADMIN_LOGIN_TEST_DATABASE_URL;

// Opt-in only: manually apply the proposed migration to an EMPTY disposable
// LOCAL database named ishaq_limiter_test*. Never use a Supabase/live URL here.
test("PostgreSQL RPC serializes concurrent attempts, expires locks and enforces the global ceiling", {
  skip: !testUrl && "Requires psql and an explicitly configured disposable local test database",
}, async () => {
  const url = new URL(testUrl);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  assert.match(url.pathname, /^\/ishaq_limiter_test[a-z0-9_]*$/);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol));
  const inheritedEnv = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^PG/i.test(name)));
  const env = { ...inheritedEnv, PGHOST: url.hostname.replace(/[\[\]]/g, ""), PGPORT: url.port || "5432",
    PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGCONNECT_TIMEOUT: "3" };
  async function sql(query) {
    try { return (await exec("psql", ["-XAt", "-v", "ON_ERROR_STOP=1", "-c", query], { env })).stdout.trim(); }
    catch { throw new Error("Local PostgreSQL test failed; inspect the disposable test database (connection details suppressed)"); }
  }
  assert.equal(await sql("select count(*) from public.admin_login_attempts"), "0", "requires a fresh empty test database");
  const permissions = await sql(`
    select role_name, has_function_privilege(role_name, 'public.consume_admin_login_attempt(text)', 'EXECUTE'),
      has_table_privilege(role_name, 'public.admin_login_attempts', 'SELECT, INSERT, UPDATE, DELETE')
    from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
    order by role_name`);
  assert.deepEqual(permissions.split(/\r?\n/), ["anon|f|f", "authenticated|f|f", "service_role|t|f"]);
  const consume = (id) => sql(`set role service_role; select allowed from public.consume_admin_login_attempt('${id.toString(16).padStart(64, "0")}')`);
  const results = await Promise.all(Array.from({ length: 20 }, () => consume(1)));
  assert.equal(results.filter((v) => v === "t").length, 5);
  assert.equal(results.filter((v) => v === "f").length, 15);
  assert.equal(await sql("select retry_after_seconds > 0 and retry_after_seconds <= 900 from public.consume_admin_login_attempt(lpad('1',64,'0'))"), "t");
  await sql("update public.admin_login_attempts set expires_at = clock_timestamp() - interval '1 second' where bucket_key <> 'global'");
  assert.equal(await consume(1), "t");
  const distributed = await Promise.all(Array.from({ length: 60 }, (_, i) => consume(i + 2)));
  assert.equal(distributed.filter((v) => v === "t").length, 44); // 50 total including six earlier reservations
  const snapshot = "select attempts, expires_at from public.admin_login_attempts where bucket_key='global'";
  const lockedWindow = await sql(snapshot);
  assert.match(lockedWindow, /^50\|/);
  assert.equal(await consume(1000), "f");
  assert.equal(await sql(snapshot), lockedWindow, "rejected requests must not extend the global window");
  assert.equal(await sql("select retry_after_seconds between 1 and 900 from public.consume_admin_login_attempt(lpad('a',64,'0'))"), "t");
  await sql("update public.admin_login_attempts set expires_at = clock_timestamp() - interval '1 second'");
  assert.equal(await consume(1000), "t");
  assert.equal(await sql("select attempts from public.admin_login_attempts where bucket_key='global'"), "1");
});
