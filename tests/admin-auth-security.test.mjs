import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSignedAdminSessionToken,
  validateAdminSessionToken,
} from "../app/admin-session.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const testSecret = "test-session-secret-never-used-in-production";

test("session tokens are random, signed and expire after twelve hours", async () => {
  const now = Date.now();
  const first = await createSignedAdminSessionToken(testSecret, now);
  const second = await createSignedAdminSessionToken(testSecret, now);
  assert.notEqual(first, second);
  assert.equal(await validateAdminSessionToken(first, testSecret, now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000), true);
  assert.equal(await validateAdminSessionToken(first, testSecret, now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000 + 1), false);
  assert.equal(await validateAdminSessionToken(`${first.slice(0, -1)}0`, testSecret, now), false);
});

test("origin validation rejects cross-site state-changing requests", () => {
  const auth = read("app/admin-auth.ts");
  assert.match(auth, /x-forwarded-host/);
  assert.match(auth, /originUrl\.host === host/);
  assert.match(auth, /originUrl\.protocol ===/);
});

test("admin session cookie and logout use hardened matching attributes", () => {
  const login = read("app/api/admin/login/route.ts");
  const logout = read("app/api/admin/logout/route.ts");
  for (const source of [login, logout]) {
    assert.match(source, /httpOnly: true/);
    assert.match(source, /secure: process\.env\.NODE_ENV === "production"/);
    assert.match(source, /sameSite: "lax"/);
    assert.match(source, /path: "\/"/);
    assert.match(source, /hasTrustedAdminOrigin/);
  }
  assert.match(logout, /export async function POST/);
  assert.match(logout, /maxAge: 0/);
  assert.doesNotMatch(logout, /export async function GET/);
});

test("production bypass remains impossible and mutations validate origin plus session", () => {
  const auth = read("app/admin-auth.ts");
  assert.match(auth, /process\.env\.NODE_ENV !== "production"/);
  const mutationRoutes = [
    "app/api/site/route.ts",
    "app/api/upload/route.ts",
    "app/api/admin/hero-slides/route.ts",
    "app/api/admin/hero-slides/[id]/route.ts",
    "app/api/admin/hero-settings/route.ts",
    "app/api/admin/home-product-order/route.ts",
    "app/api/admin/paper-specifications-update/route.ts",
  ].map(read).join("\n");
  assert.doesNotMatch(mutationRoutes, /export async function (?:POST|PUT|PATCH|DELETE)[^{]+\{\s*(?:const admin = await )?requireAdminApi\(\)/s);
  assert.match(mutationRoutes, /requireAdminApi\(request\)/);
});
