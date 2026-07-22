import { createHash } from "node:crypto";
import { requireAdminApi } from "../../../../admin-auth";
import { getSupabaseAdmin } from "../../../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductRecord = Record<string, unknown> & {
  id: number;
  name: string;
  category: string;
};

const approvedTargets = [
  { name: "EPSON EcoTank L8180", category: "ecotank-6-color" },
  { name: "EPSON EcoTank L8050", category: "ecotank-6-color" },
  { name: "EPSON EcoTank L18050", category: "ecotank-6-color" },
  { name: "EPSON EcoTank L6490", category: "ecotank" },
  { name: "EPSON EcoTank L6270", category: "ecotank" },
  { name: "EPSON EcoTank L4260", category: "ecotank" },
  { name: "EPSON EcoTank L11050", category: "ecotank" },
  { name: "EPSON EcoTank L3250", category: "ecotank" },
  { name: "EPSON EcoTank L3210", category: "ecotank" },
  { name: "EPSON EcoTank L15150", category: "ecotank" },
] as const;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonicalize(item)]));
}

function nonCategoryFingerprint(products: ProductRecord[]) {
  const unchangedFields = products
    .map((product) => Object.fromEntries(Object.entries(product).filter(([key]) => key !== "category")))
    .sort((left, right) => Number(left.id) - Number(right.id));
  return createHash("sha256").update(JSON.stringify(canonicalize(unchangedFields))).digest("hex");
}

function categoryCounts(products: ProductRecord[]) {
  return {
    workforce: products.filter((product) => product.category === "workforce").length,
    ecotank: products.filter((product) => product.category === "ecotank").length,
    "ecotank-6-color": products.filter((product) => product.category === "ecotank-6-color").length,
    lq: products.filter((product) => product.category === "lq").length,
  };
}

async function readAndValidateProducts() {
  const client = getSupabaseAdmin();
  const result = await client.from("products").select("*").order("id", { ascending: true });
  if (result.error) throw new Error(`تعذر قراءة المنتجات قبل الترحيل: ${result.error.message}`);
  const products = (result.data ?? []) as ProductRecord[];
  if (products.length !== 22) throw new Error(`أُلغي الترحيل: العدد المتوقع 22 والفعلي ${products.length}`);

  const matches = approvedTargets.map((target) => ({
    ...target,
    products: products.filter((product) => product.name === target.name),
  }));
  const invalidMatch = matches.find((match) => match.products.length !== 1);
  if (invalidMatch) {
    throw new Error(`أُلغي الترحيل: الاسم ${invalidMatch.name} طابق ${invalidMatch.products.length} منتجًا بدلًا من منتج واحد`);
  }
  const alreadyClassified = matches.find((match) => match.products[0].category !== "printers");
  if (alreadyClassified) {
    throw new Error(`أُلغي الترحيل: المنتج ${alreadyClassified.name} فئته الحالية ${alreadyClassified.products[0].category}`);
  }
  const counts = categoryCounts(products);
  if (counts.workforce !== 12) throw new Error(`أُلغي الترحيل: عدد WorkForce الحالي ${counts.workforce} بدلًا من 12`);

  return {
    client,
    products,
    targets: matches.map((match) => ({
      id: Number(match.products[0].id),
      name: match.name,
      category: match.category,
    })),
    fingerprint: nonCategoryFingerprint(products),
  };
}

async function restoreUnclassifiedCategories(client: ReturnType<typeof getSupabaseAdmin>, targets: Array<{ id: number; category: string }>) {
  for (const category of ["ecotank-6-color", "ecotank"] as const) {
    const ids = targets.filter((target) => target.category === category).map((target) => target.id);
    if (!ids.length) continue;
    await client.from("products").update({ category: "printers" }).eq("category", category).in("id", ids);
  }
}

export async function GET() {
  if (!await requireAdminApi()) return Response.json({ error: "غير مصرح" }, { status: 403 });
  try {
    const preflight = await readAndValidateProducts();
    return Response.json({
      ok: true,
      total: preflight.products.length,
      workforce: 12,
      matched: preflight.targets.length,
      targets: preflight.targets,
      nonCategoryFingerprint: preflight.fingerprint,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "فشل الفحص المسبق" }, { status: 409 });
  }
}

export async function POST() {
  if (!await requireAdminApi()) return Response.json({ error: "غير مصرح" }, { status: 403 });
  let preflight: Awaited<ReturnType<typeof readAndValidateProducts>> | null = null;
  try {
    preflight = await readAndValidateProducts();
    const updatedProducts: Array<{ id: number; name: string; category: string }> = [];

    for (const category of ["ecotank-6-color", "ecotank"] as const) {
      const targets = preflight.targets.filter((target) => target.category === category);
      const result = await preflight.client.from("products")
        .update({ category })
        .eq("category", "printers")
        .in("id", targets.map((target) => target.id))
        .select("id,name,category");
      if (result.error) throw new Error(`تعذر تحديث فئة ${category}: ${result.error.message}`);
      if (result.data?.length !== targets.length) {
        throw new Error(`أُلغي الترحيل: تم تحديث ${result.data?.length ?? 0} من ${targets.length} في فئة ${category}`);
      }
      updatedProducts.push(...result.data.map((product) => ({
        id: Number(product.id),
        name: String(product.name),
        category: String(product.category),
      })));
    }

    const verification = await preflight.client.from("products").select("*").order("id", { ascending: true });
    if (verification.error) throw new Error(`تعذر التحقق بعد الترحيل: ${verification.error.message}`);
    const productsAfter = (verification.data ?? []) as ProductRecord[];
    const counts = categoryCounts(productsAfter);
    if (productsAfter.length !== 22 || counts.workforce !== 12 || counts.ecotank !== 7 || counts["ecotank-6-color"] !== 3 || counts.lq !== 0) {
      throw new Error("فشلت مطابقة أعداد الفئات بعد الترحيل");
    }
    const fingerprintAfter = nonCategoryFingerprint(productsAfter);
    if (fingerprintAfter !== preflight.fingerprint) throw new Error("تغير حقل آخر غير الفئة أثناء الترحيل");

    return Response.json({
      ok: true,
      updatedCount: updatedProducts.length,
      updatedProducts,
      counts: { all: productsAfter.length, ...counts },
      nonCategoryFingerprintBefore: preflight.fingerprint,
      nonCategoryFingerprintAfter: fingerprintAfter,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (preflight) await restoreUnclassifiedCategories(preflight.client, preflight.targets);
    return Response.json({ error: error instanceof Error ? error.message : "فشل ترحيل فئات EcoTank وتمت محاولة التراجع" }, { status: 500 });
  }
}
