import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("upload verifies auth and origin before parsing multipart content", () => {
  const route = read("app/api/upload/route.ts");
  assert.ok(route.indexOf("requireAdminApi(request)") < route.indexOf("request.formData()"));
  assert.match(route, /verifiedImageMimeType\(file\)/);
  assert.match(route, /uploadImage\(file, requestedFolder, verifiedMimeType\)/);
});

test("storage uses verified MIME, UUID paths and never overwrites", () => {
  const storage = read("lib/supabase-storage.ts");
  const paths = read("lib/image-storage-path.ts");
  assert.match(paths, /crypto\.randomUUID\(\)/);
  assert.match(storage, /imageStoragePath\(folder, verifiedMimeType\)/);
  assert.match(storage, /contentType: verifiedMimeType/);
  assert.match(storage, /upsert: false/);
  assert.doesNotMatch(storage, /file\.name/);
  assert.doesNotMatch(storage, /contentType: file\.type/);
});

test("server and bucket retain the closed image allowlist and four-megabyte limit", () => {
  const validation = read("lib/image-file-validation.ts");
  const sql = read("supabase/setup.sql");
  for (const mime of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
    assert.match(validation, new RegExp(mime));
    assert.match(sql, new RegExp(mime));
  }
  assert.match(validation, /4 \* 1024 \* 1024/);
  assert.match(sql, /4194304/);
  assert.doesNotMatch(validation, /image\/svg\+xml|application\/pdf/);
});

test("service role remains server-only and storage errors do not leak provider details", () => {
  const server = read("lib/supabase-server.ts");
  const storage = read("lib/supabase-storage.ts");
  const route = read("app/api/upload/route.ts");
  assert.match(server, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(read("app/admin/admin-dashboard.tsx"), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(storage, /error\.message/);
  assert.doesNotMatch(route, /error\.message/);
});
