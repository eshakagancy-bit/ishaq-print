import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
// Execute the actual TS route with only its external boundaries replaced. No
// Next server or live database credentials are needed, and no writes leave tests.
function load(path, replacements = {}, environment = {}) {
  const output = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, require: (name) => replacements[name] ?? require(name),
    process: { env: environment }, Request, Response, FormData, URL, AbortSignal,
  }, { filename: path });
  return exports;
}
const request = (password = "correct-test-password", headers = {}) => new Request("https://example.test/api/admin/login", {
  method: "POST", body: new URLSearchParams({ password }), headers,
});
function fixture(consume) {
  let verified = 0;
  const route = load("app/api/admin/login/route.ts", {
    "../../../../lib/admin-login-rate-limit": { adminLoginClientKey: () => "test-key" },
    "../../../../lib/site-database": { consumeAdminLoginAttempt: consume },
    "../../../admin-auth": {
      ADMIN_COOKIE: "eshak_admin_session", ADMIN_SESSION_MAX_AGE_SECONDS: 43200,
      hasTrustedAdminOrigin: (r) => r.headers.get("origin") !== "https://evil.test",
      passwordIsValid: async (p) => { verified++; return p === "correct-test-password"; },
      createAdminSessionToken: async () => "signed-test-token",
    },
  }, { NODE_ENV: "production" });
  return { POST: route.POST, verified: () => verified };
}

test("allowed login preserves redirect and hardened cookie; failed password creates no cookie", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return { allowed: true, retryAfterSeconds: 0 }; });
  const good = await f.POST(request());
  assert.equal(good.status, 303);
  assert.equal(good.headers.get("location"), "https://example.test/admin");
  const cookie = good.headers.get("set-cookie");
  for (const value of ["eshak_admin_session=signed-test-token", "HttpOnly", "Secure", "SameSite=lax", "Max-Age=43200", "Path=/"]) assert.ok(cookie.includes(value));
  const bad = await f.POST(request("wrong"));
  assert.equal(bad.status, 401);
  assert.equal(bad.headers.get("set-cookie"), null);
  assert.equal(calls, 2);
});

test("lockout precedes password verification and cannot be reset with a correct password", async () => {
  const f = fixture(async () => ({ allowed: false, retryAfterSeconds: 123 }));
  const response = await f.POST(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "123");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(f.verified(), 0);
});

test("backend failure fails closed with a generic 503 and no session", async () => {
  const f = fixture(async () => { throw Error("private backend detail"); });
  const r = await f.POST(request());
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("retry-after"), "60");
  assert.equal(r.headers.get("set-cookie"), null);
  assert.ok(!(await r.text()).includes("private backend detail"));
  assert.equal(f.verified(), 0);
});

test("untrusted origins skip storage; malformed requests consume a reservation", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return { allowed: true, retryAfterSeconds: 0 }; });
  assert.equal((await f.POST(request("wrong", { origin: "https://evil.test" }))).status, 403);
  assert.equal(calls, 0);
  assert.equal((await f.POST(new Request("https://example.test/api/admin/login", { method: "POST", body: "invalid" }))).status, 400);
  assert.equal(calls, 1);
});

test("route uses each atomic backend decision under concurrent requests and allows login after expiry", async () => {
  // Shared-store contract double; actual SQL expiry/concurrency is covered by
  // the opt-in local PostgreSQL test, not claimed from this mock.
  let attempts = 0;
  let now = 0;
  let expires = 900;
  const consume = async () => {
    if (now >= expires) { attempts = 0; expires = now + 900; }
    return ++attempts <= 5 ? { allowed: true, retryAfterSeconds: 0 } : { allowed: false, retryAfterSeconds: expires - now };
  };
  const f = fixture(consume);
  const replies = await Promise.all(Array.from({ length: 20 }, () => f.POST(request("wrong"))));
  assert.equal(replies.filter((r) => r.status === 401).length, 5);
  assert.equal(replies.filter((r) => r.status === 429).length, 15);
  assert.equal(f.verified(), 5);
  now = 900;
  assert.equal((await f.POST(request())).status, 303);
});

test("client keys ignore spoofable headers, normalize IPv6 /64, and never contain raw IPs", () => {
  const { adminLoginClientKey: key } = load("lib/admin-login-rate-limit.ts");
  const env = { VERCEL: "1", ADMIN_SESSION_SECRET: "test-only-secret" };
  const a = request("x", { "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "1.2.3.4" });
  const b = request("x", { "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "5.6.7.8" });
  assert.equal(key(a, env), key(b, env));
  assert.match(key(a, env), /^[a-f0-9]{64}$/);
  assert.equal(key(a, { ...env, VERCEL: "0" }), key(b, { ...env, VERCEL: "0" }));
  assert.equal(key(a, { ...env, VERCEL: "0" }), key(request(), { ...env, VERCEL: "0" }));
  const ip = (s) => request("x", { "x-vercel-forwarded-for": s });
  assert.equal(key(ip("2001:db8::1"), env), key(ip("2001:0db8:0000:0000:ffff::2"), env));
  assert.notEqual(key(ip("2001:db8:0:1::1"), env), key(ip("2001:db8::1"), env));
  assert.equal(key(ip("192.0.2.1, 8.8.8.8"), env), key(request(), env));
  assert.throws(() => key(request(), {}));
});

test("RPC adapter rejects malformed backend results and never retries a reservation", async () => {
  // Load only the limiter adapter from the actual database module, whose other
  // exports are unrelated and have Next extensionless imports.
  const source = read("lib/site-database.ts");
  const adapter = source.slice(source.indexOf("export async function consumeAdminLoginAttempt"), source.indexOf('import { DEFAULT_SUPABASE_STORAGE_BUCKET'));
  const output = ts.transpileModule(adapter, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  let result = { data: [{ allowed: false, retry_after_seconds: 10 }], error: null };
  let calls = 0;
  const exports = {};
  vm.runInNewContext(output, { exports, AbortSignal, getSupabaseAdmin: () => ({ rpc: () => { calls++; return { abortSignal: async () => result }; } }) });
  assert.equal((await exports.consumeAdminLoginAttempt("a".repeat(64))).retryAfterSeconds, 10);
  for (const data of [null, [], [{ allowed: true, retry_after_seconds: 5 }], [{ allowed: false, retry_after_seconds: 0 }], [{ allowed: false, retry_after_seconds: 901 }]]) {
    result = { data, error: null };
    await assert.rejects(exports.consumeAdminLoginAttempt("a".repeat(64)));
  }
  assert.equal(calls, 6);
});

test("setup and migration contain the same restricted atomic SQL", () => {
  const migration = read("supabase/migrations/20261117090000_admin_login_rate_limit.sql");
  assert.ok(read("supabase/setup.sql").includes(migration.slice(migration.indexOf("create table"), migration.lastIndexOf("commit;"))));
  assert.match(migration, /for update/);
  assert.match(migration, /global_row.attempts >= 50/);
  assert.match(migration, /client_row.attempts >= 5/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
});
