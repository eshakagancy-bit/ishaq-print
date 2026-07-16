import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function exists(path) {
  try {
    await access(new URL(path, root));
    return true;
  } catch {
    return false;
  }
}

test("uses native Next.js scripts for Vercel", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.start, "next start");
  const serialized = JSON.stringify(packageJson);
  for (const forbidden of ["wrangler", "vinext", "@cloudflare", "drizzle-orm/d1"]) {
    assert.equal(serialized.includes(forbidden), false, `package.json still contains ${forbidden}`);
  }
});

test("obsolete Cloudflare runtime files are absent", async () => {
  for (const path of ["vite.config.ts", "worker/index.ts", "worker-configuration.d.ts", "drizzle.config.ts", "db/index.ts"]) {
    assert.equal(await exists(path), false, `${path} should not exist`);
  }
});

test("Supabase database setup and Vercel config are included", async () => {
  assert.equal(await exists("supabase/setup.sql"), true);
  assert.equal(await exists("vercel.json"), true);
  const envExample = await readFile(new URL(".env.example", root), "utf8");
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY=/);
  assert.match(envExample, /ADMIN_PASSWORD=/);
  assert.doesNotMatch(envExample, /CLOUDFLARE_/);
});
