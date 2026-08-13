import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses hero slides as the only main banner data source", async () => {
  const [defaults, admin, home] = await Promise.all([
    read("app/site-defaults.ts"),
    read("app/admin/admin-dashboard.tsx"),
    read("app/home-client.tsx"),
  ]);
  for (const legacyField of ["heroEyebrow", "heroTitle", "heroHighlight", "heroDescription", "heroImage"]) {
    assert.equal(defaults.includes(legacyField), false, `${legacyField} should not remain in site settings`);
    assert.equal(home.includes(`settings.${legacyField}`), false, `${legacyField} should not be read by the home page`);
  }
  assert.match(admin, /يمكن تعديل الإعلان الرئيسي وشرائح العرض من قسم إدارة البانر المتحرك/);
});

test("includes favorites and admin safety copy", async () => {
  const [home, admin] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/admin/admin-dashboard.tsx"),
  ]);
  for (const text of [
    "لم تقم بإضافة أي منتجات إلى المفضلة بعد",
    "مسح المفضلة",
    "إضافة إلى المفضلة",
    "إزالة من المفضلة",
  ]) assert.match(home, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(admin, /هل أنت متأكد من حذف هذا المنتج؟/);
  assert.match(admin, /توجد تعديلات لم يتم حفظها\. هل تريد مغادرة الصفحة؟/);
  assert.match(admin, /تم حفظ التعديلات ونشرها بنجاح ✓/);
});

test("removes forbidden visitor and preview strings", async () => {
  const paths = [
    "app/home-client.tsx",
    "app/admin/admin-dashboard.tsx",
    "app/layout.tsx",
    "app/site-defaults.ts",
    "lib/site-database.ts",
    "supabase/setup.sql",
  ];
  const combined = (await Promise.all(paths.map(read))).join("\n");
  for (const forbidden of [
    ["تقنيات وحلول", "كبرى"].join("  "),
    ["جاهز", "للإضافة"].join(" "),
    ["لوحة تحكم", "حقيقية"].join(" "),
    ["من جهة", "(الدائري)"].join(" "),
    ["This page", "could not be found"].join(" "),
    ["codex", "preview"].join("-"),
    ["develop", "ment"].join(""),
  ]) assert.equal(combined.includes(forbidden), false, `found forbidden copy: ${forbidden}`);
});

test("protects every administrative mutation route with the shared Arabic response", async () => {
  const routes = [
    "app/api/site/route.ts",
    "app/api/upload/route.ts",
    "app/api/admin/hero-slides/route.ts",
    "app/api/admin/hero-slides/[id]/route.ts",
    "app/api/admin/hero-settings/route.ts",
  ];
  for (const path of routes) {
    const source = await read(path);
    assert.match(source, /requireAdminApi/);
    assert.match(source, /ADMIN_UNAUTHORIZED_MESSAGE/);
    assert.match(source, /status: 403/);
  }
  assert.match(await read("app/admin-auth.ts"), /غير مصرح لك بتنفيذ هذه العملية/);
});

test("defines Arabic SEO, robots, sitemap and not-found content", async () => {
  const [layout, seo, robots, sitemap, notFound, adminPage] = await Promise.all([
    read("app/layout.tsx"),
    read("app/seo.ts"),
    read("app/robots.ts"),
    read("app/sitemap.ts"),
    read("app/not-found.tsx"),
    read("app/admin/page.tsx"),
  ]);
  assert.match(layout, /Engineer Ai \/ Adeeb Mohammed Ali/);
  assert.match(seo, /https:\/\/ishaq-print-zeta\.vercel\.app/);
  assert.match(seo, /locale: "ar_YE"/);
  for (const path of ["/admin", "/api/admin/", "/api/upload"]) assert.match(robots, new RegExp(path.replaceAll("/", "\\/")));
  assert.match(robots, /sitemap\.xml/);
  assert.match(sitemap, /SITE_URL/);
  assert.match(adminPage, /index:\s*false/);
  assert.match(adminPage, /follow:\s*false/);
  assert.match(adminPage, /noarchive:\s*true/);
  assert.match(notFound, /الصفحة غير موجودة/);
  assert.match(notFound, /العودة إلى الصفحة الرئيسية/);
});
