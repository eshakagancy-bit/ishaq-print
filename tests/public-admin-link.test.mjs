import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const home = read("app/home-client.tsx");
const footer = read("app/storefront-footer.tsx");
const adminPage = read("app/admin/page.tsx");
const auth = read("app/admin-auth.ts");
const login = read("app/api/admin/login/route.ts");

test("public desktop, mobile and footer navigation expose no admin link", () => {
  assert.doesNotMatch(home, /href=["'{`]\/admin/);
  assert.doesNotMatch(home, /لوحة التحكم/);
  assert.doesNotMatch(home, /admin-link|mobile-admin-nav/);
  for (const href of ["/categories", "/printers", "/inks", "/papers", "#contact"]) {
    assert.match(home, new RegExp(`href="${href}"`));
  }
  assert.match(home, /<StorefrontFooter/);
  assert.match(footer, /<footer>/);
});

test("direct admin access and the existing login session flow remain intact", () => {
  assert.match(adminPage, /isAdminSession\(\)/);
  assert.match(adminPage, /action="\/api\/admin\/login"/);
  assert.match(adminPage, /type="password"/);
  assert.match(adminPage, /<AdminDashboard/);
  assert.match(login, /createAdminSessionToken/);
  assert.match(login, /NextResponse\.redirect\(new URL\("\/admin"/);
  assert.match(auth, /ADMIN_COOKIE/);
  assert.match(auth, /isAdminSession/);
});
