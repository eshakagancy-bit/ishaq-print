import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contentSecurityPolicy, getSecurityHeaders } from "../app/security-headers.ts";

const securityHeaders = getSecurityHeaders("production");
const headerMap = new Map(securityHeaders.map(({ key, value }) => [key.toLowerCase(), value]));

test("config applies security headers to every application path", async () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /source: "\/:path\*"/);
  assert.match(config, /headers: getSecurityHeaders\(\)/);
});

test("HSTS is omitted outside production", () => {
  assert.equal(getSecurityHeaders("development").some(({ key }) => key === "Strict-Transport-Security"), false);
});

test("production security headers use safe final values", () => {
  assert.equal(headerMap.get("x-content-type-options"), "nosniff");
  assert.equal(headerMap.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(headerMap.get("strict-transport-security"), "max-age=31536000");
  assert.equal(headerMap.has("x-frame-options"), false);
});

test("CSP supports current Next.js and image sources without unsafe eval", () => {
  for (const directive of [
    "default-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "connect-src 'self'",
    "img-src 'self' data: blob: https:",
  ]) assert.match(contentSecurityPolicy, new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(contentSecurityPolicy, /script-src 'self' 'unsafe-inline'/);
  assert.match(contentSecurityPolicy, /style-src 'self' 'unsafe-inline'/);
  assert.doesNotMatch(contentSecurityPolicy, /unsafe-eval/);
  assert.doesNotMatch(contentSecurityPolicy, /default-src \*/);
});
