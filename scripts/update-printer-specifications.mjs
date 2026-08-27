import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { pathToFileURL } from "node:url";
import {
  assertPrinterPageContent,
  equalContent,
  selectArabicContent,
} from "./arabic-content-integrity.mjs";
import { PRINTER_CONTENT } from "./printer-content.mjs";

const BACKUP_URL = new URL("../tmp/printer-content-corrupted-backup.json", import.meta.url);

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) loadEnvFile(envFile);
}

const usageAliases = new Map([["مكتب شخصي", "مكتبي شخصي"]]);

function target(model, input) {
  const functions = Object.entries(input.functions)
    .filter(([, enabled]) => enabled)
    .map(([name]) => ({ print: "طباعة", copy: "نسخ", scan: "مسح ضوئي", fax: "فاكس" })[name]);
  const duplexMode = input.duplex.startsWith("تلقائي") ? "automatic" : input.duplex === "يدوي" ? "manual" : "none";
  return {
    model,
    badge: input.badge,
    description: input.shortDescription,
    features: input.legacyFeatures.split(",").map((item) => item.trim()),
    specifications: {
      paperSize: input.paperSize,
      printerType: input.printerType,
      printTechnology: input.printTechnology,
      colorMode: input.colorMode,
      functions,
      wifi: input.connectivity.wifi,
      wifiDirect: input.connectivity.wifiDirect,
      ethernet: input.connectivity.ethernet,
      usb: input.connectivity.usb,
      mobilePrinting: input.connectivity.mobilePrinting,
      scanner: input.features.scanner,
      fax: input.features.fax,
      adf: input.features.adf,
      borderless: input.features.borderlessPrinting,
      duplex: duplexMode === "automatic",
      duplexMode,
      cdDvdPrinting: input.media.cdDvdPrinting,
      plasticCardPrinting: input.media.plasticCardPrinting,
      colorCount: input.colorCount,
      printSpeed: input.printSpeed,
      speedUnit: input.speedUnit === "ipm" ? "صورة/دقيقة" : "صفحة/دقيقة",
      adfCapacity: input.adfCapacity,
      photoPrintTimeSeconds: input.photoPrintTimeSeconds,
      inkType: input.inkType,
      usage: input.recommendedUses.map((item) => usageAliases.get(item) ?? item),
    },
    pageContent: PRINTER_CONTENT[model],
  };
}

export const PRINTER_SPECIFICATION_TARGETS = [
  target("L15180", {
    paperSize: "A3+", printerType: "EcoTank متعددة الوظائف للأعمال", printTechnology: "PrecisionCore", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: true },
    connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: true, adf: true, borderlessPrinting: true }, duplex: "تلقائي حتى A3",
    media: { cdDvdPrinting: false, plasticCardPrinting: false }, colorCount: 4, printSpeed: 25, speedUnit: "ipm", adfCapacity: 50, photoPrintTimeSeconds: 27,
    inkType: "DURABrite ET Pigment - أربعة ألوان Pigment",
    recommendedUses: ["شركات ومؤسسات", "مكاتب", "أعمال", "مجموعات عمل", "أحجام طباعة مرتفعة", "طباعة A3+"], badge: "A3+ للأعمال",
    shortDescription: "طابعة EcoTank احترافية للأعمال تدعم A3+ مع طباعة ومسح ونسخ وفاكس، اتصال شبكي متكامل وطباعة مزدوجة تلقائية.",
    featuresList: ["طباعة A3/A3+", "سرعة حتى 25 ipm", "ADF سعة 50 ورقة", "Duplex تلقائي حتى A3", "Ethernet وWi-Fi وWi-Fi Direct", "أحبار Pigment للأعمال"],
    usesList: ["المكاتب الكبيرة", "الشركات", "التقارير", "المستندات", "الجداول", "الفواتير", "الطباعة ذات الحجم المرتفع"],
    whyChoose: "تجمع بين طباعة A3+ والإنتاجية العالية والاتصال الشبكي المتكامل ونظام EcoTank منخفض التكلفة التشغيلية.",
    legacyFeatures: "إنتاجية عالية, اتصال شبكي, طباعة سريعة, مناسب للأعمال, تكلفة تشغيل منخفضة",
  }),
  target("L6290", {
    paperSize: "A4", printerType: "EcoTank متعددة الوظائف", printTechnology: "PrecisionCore", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: true }, connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: true, adf: true, borderlessPrinting: true }, duplex: "تلقائي A4", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 15.5, speedUnit: "ipm", adfCapacity: 30, photoPrintTimeSeconds: 69, inkType: "Pigment Black + Dye CMY",
    recommendedUses: ["مكتبي", "مكتب شخصي", "فواتير وسندات", "أعمال", "شركات ومؤسسات"], badge: "مكتبية متكاملة",
    shortDescription: "طابعة مكتبية EcoTank A4 متكاملة مع فاكس وADF وطباعة مزدوجة تلقائية واتصال Ethernet وWi-Fi.",
    featuresList: ["طباعة ونسخ ومسح وفاكس", "ADF سعة 30 ورقة", "Duplex تلقائي", "Ethernet", "Wi-Fi Direct", "خزان حبر اقتصادي"],
    usesList: ["المكاتب", "الأعمال اليومية", "الفواتير والسندات", "المستندات", "مكاتب الشركات"],
    whyChoose: "خيار مكتبي متكامل يجمع وظائف الطباعة والمسح والنسخ والفاكس مع اتصال شبكي وتكلفة تشغيل منخفضة.",
    legacyFeatures: "خزان حبر اقتصادي, Wi-Fi, Wi-Fi Direct, طباعة من الجوال, جودة طباعة عالية",
  }),
  target("L5298", {
    paperSize: "A4", printerType: "EcoTank متعددة الوظائف مع فاكس", printTechnology: "Micro Piezo / Heat-Free", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: true }, connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: true, adf: true, borderlessPrinting: true }, duplex: "يدوي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 10, speedUnit: "ipm", adfCapacity: 30, photoPrintTimeSeconds: 69, inkType: "Dye Ink",
    recommendedUses: ["مكتبي", "مكتب شخصي", "فواتير وسندات", "أعمال", "منزلي"], badge: "فاكس + ADF",
    shortDescription: "طابعة EcoTank A4 عملية للمكاتب تجمع الطباعة والمسح والنسخ والفاكس مع ADF وشبكة Ethernet واتصال لاسلكي.",
    featuresList: ["طباعة ونسخ ومسح وفاكس", "ADF سعة 30 ورقة", "Ethernet", "Wi-Fi Direct", "طباعة من الجوال", "تكلفة تشغيل اقتصادية"],
    usesList: ["المكاتب الصغيرة", "الفواتير والسندات", "المستندات اليومية", "الأعمال المكتبية", "الاستخدام المنزلي المتقدم"],
    whyChoose: "مناسبة لمن يحتاج جهازًا اقتصاديًا متكامل الوظائف مع ADF وفاكس وشبكة Ethernet.",
    legacyFeatures: "خزان حبر اقتصادي, Wi-Fi, Wi-Fi Direct, طباعة من الجوال, فاكس, ADF",
  }),
  target("L4360", {
    paperSize: "A4", printerType: "EcoTank متعددة الوظائف", printTechnology: "PrecisionCore", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: false }, connectivity: { wifi: true, ethernet: false, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: false, adf: false, borderlessPrinting: true }, duplex: "تلقائي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 15, speedUnit: "ipm", adfCapacity: null, photoPrintTimeSeconds: 60, inkType: "Pigment Black + Dye Colour",
    recommendedUses: ["منزلي", "مكتب شخصي", "مكتبي", "صور", "أعمال"], badge: "Duplex تلقائي",
    shortDescription: "EcoTank حديثة ومدمجة مع PrecisionCore وطباعة مزدوجة تلقائية، مناسبة للمنزل والمكاتب الصغيرة.",
    featuresList: ["PrecisionCore", "Duplex تلقائي", "Wi-Fi", "Wi-Fi Direct", "طباعة من الجوال", "طباعة بدون حواف"],
    usesList: ["المنزل", "المكاتب الصغيرة", "المستندات", "الصور", "الاستخدام اليومي"], whyChoose: "توفر طباعة EcoTank اقتصادية مع PrecisionCore وDuplex تلقائي في تصميم مناسب للمنزل والمكتب.",
    legacyFeatures: "خزان حبر اقتصادي, Wi-Fi, Wi-Fi Direct, Duplex تلقائي, طباعة من الجوال",
  }),
  target("L3266", {
    paperSize: "A4", printerType: "EcoTank متعددة الوظائف", printTechnology: "Micro Piezo", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: false }, connectivity: { wifi: true, ethernet: false, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: false, adf: false, borderlessPrinting: true }, duplex: "يدوي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 10, speedUnit: "ipm", adfCapacity: null, photoPrintTimeSeconds: 69, inkType: "Dye Ink",
    recommendedUses: ["منزلي", "مكتب شخصي", "صور", "مكتبي"], badge: "منزلي ومكتبي",
    shortDescription: "طابعة EcoTank اقتصادية ثلاثية الوظائف للمنزل والمكتب الصغير مع Wi-Fi Direct وطباعة صور بدون حواف.",
    featuresList: ["طباعة ونسخ ومسح", "Wi-Fi", "Wi-Fi Direct", "طباعة من الجوال", "طباعة صور بدون حواف", "خزان حبر اقتصادي"],
    usesList: ["المنزل", "مكتب شخصي", "الصور اليومية", "المستندات", "الدراسة"], whyChoose: "خيار اقتصادي وسهل الاستخدام للطباعة والمسح والنسخ مع اتصال لاسلكي وخزانات EcoTank.",
    legacyFeatures: "خزان حبر اقتصادي, Wi-Fi, Wi-Fi Direct, طباعة من الجوال, طباعة صور",
  }),
  target("L3160", {
    paperSize: "A4", printerType: "EcoTank متعددة الوظائف", printTechnology: "Micro Piezo", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: false }, connectivity: { wifi: true, ethernet: false, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: false, adf: false, borderlessPrinting: true }, duplex: "يدوي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 10, speedUnit: "ipm", adfCapacity: null, photoPrintTimeSeconds: 69, inkType: "Dye Ink",
    recommendedUses: ["منزلي", "مكتب شخصي", "صور", "مكتبي"], badge: "اقتصادية",
    shortDescription: "طابعة EcoTank لاسلكية ثلاثية الوظائف مناسبة للاستخدام المنزلي والمكاتب الشخصية وطباعة الصور اليومية.",
    featuresList: ["طباعة ونسخ ومسح", "Wi-Fi", "Wi-Fi Direct", "طباعة من الجوال", "طباعة بدون حواف", "استهلاك حبر اقتصادي"],
    usesList: ["المنزل", "المكتب الشخصي", "المستندات", "الدراسة", "الصور اليومية"], whyChoose: "توفر الوظائف الأساسية مع نظام EcoTank واتصال لاسلكي في طابعة اقتصادية للاستخدام اليومي.",
    legacyFeatures: "خزان حبر اقتصادي, Wi-Fi, Wi-Fi Direct, طباعة من الجوال, جودة طباعة عالية",
  }),
  target("L5290", {
    paperSize: "A4", printerType: "EcoTank متعددة الوظائف مع فاكس", printTechnology: "Micro Piezo", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: true }, connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: true, adf: true, borderlessPrinting: true }, duplex: "يدوي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 10, speedUnit: "ipm", adfCapacity: 30, photoPrintTimeSeconds: 69, inkType: "Dye Ink",
    recommendedUses: ["مكتبي", "مكتب شخصي", "فواتير وسندات", "أعمال", "منزلي"], badge: "فاكس + ADF",
    shortDescription: "EcoTank A4 متكاملة للمكاتب مع فاكس وADF وشبكة Ethernet وWi-Fi Direct وتكلفة تشغيل منخفضة.",
    featuresList: ["طباعة ونسخ ومسح وفاكس", "ADF سعة 30 ورقة", "Ethernet", "Wi-Fi Direct", "طباعة من الجوال", "تكلفة تشغيل منخفضة"],
    usesList: ["المكاتب", "الفواتير والسندات", "المستندات", "الأعمال اليومية", "مكاتب الشركات"], whyChoose: "طابعة مكتبية متكاملة تجمع الفاكس وADF والاتصال الشبكي مع اقتصاد نظام EcoTank.",
    legacyFeatures: "خزان حبر اقتصادي, Wi-Fi, Wi-Fi Direct, Ethernet, فاكس, ADF",
  }),
  target("L14150", {
    paperSize: "A3+", printerType: "EcoTank واسعة التنسيق متعددة الوظائف", printTechnology: "PrecisionCore", colorMode: "ملون",
    functions: { print: true, copy: true, scan: true, fax: true }, connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: true, adf: true, borderlessPrinting: true }, duplex: "تلقائي حتى A4", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 17, speedUnit: "ipm", adfCapacity: 35, photoPrintTimeSeconds: 71, inkType: "Pigment Black + Dye Colour",
    recommendedUses: ["طباعة A3+", "شركات ومؤسسات", "مكاتب", "أعمال", "مكتب شخصي"], badge: "A3+",
    shortDescription: "طابعة EcoTank A3+ مكتبية متعددة الوظائف مع ADF وفاكس وEthernet وطباعة مزدوجة تلقائية حتى A4.",
    featuresList: ["طباعة A3+", "ADF سعة 35 ورقة", "فاكس", "Ethernet", "Wi-Fi Direct", "Duplex تلقائي حتى A4"],
    usesList: ["المكاتب", "طباعة A3+", "المستندات الكبيرة", "الجداول", "الأعمال"], whyChoose: "تقدم مرونة A3+ مع وظائف مكتبية متكاملة واتصال شبكي وتكلفة تشغيل منخفضة.",
    legacyFeatures: "طباعة A3+, اتصال شبكي, فاكس, ADF, طباعة من الجوال, تكلفة تشغيل منخفضة",
  }),
  target("WF-C529R", {
    paperSize: "A4", printerType: "WorkForce Pro للأعمال", printTechnology: "PrecisionCore Heat-Free", colorMode: "ملون",
    functions: { print: true, copy: false, scan: false, fax: false }, connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: false, fax: false, adf: false, borderlessPrinting: false }, duplex: "تلقائي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 4, printSpeed: 24, speedUnit: "ppm", adfCapacity: null, photoPrintTimeSeconds: null, inkType: "RIPS - Replaceable Ink Pack System",
    recommendedUses: ["شركات ومؤسسات", "مكاتب", "أعمال", "مجموعات عمل", "أحجام طباعة مرتفعة", "فواتير وسندات"], badge: "WorkForce Pro",
    shortDescription: "طابعة WorkForce Pro ملونة مخصصة لمجموعات العمل، بسرعة 24 صفحة/دقيقة ونظام أحبار RIPS عالي الإنتاجية.",
    featuresList: ["سرعة حتى 24 ppm", "PrecisionCore Heat-Free", "Duplex تلقائي", "Ethernet", "Wi-Fi Direct", "نظام RIPS عالي الإنتاجية"],
    usesList: ["مجموعات العمل", "الشركات", "المكاتب", "الفواتير والسندات", "الطباعة بكميات مرتفعة"], whyChoose: "مصممة لبيئات العمل التي تحتاج طباعة ملونة سريعة وإنتاجية مرتفعة مع نظام RIPS.",
    legacyFeatures: "إنتاجية عالية, اتصال شبكي, طباعة سريعة, Duplex تلقائي, مناسب للأعمال",
  }),
  target("WF-M5799DWF", {
    paperSize: "A4 / Legal", printerType: "WorkForce Pro أحادية اللون متعددة الوظائف", printTechnology: "PrecisionCore Heat-Free", colorMode: "أحادي اللون",
    functions: { print: true, copy: true, scan: true, fax: true }, connectivity: { wifi: true, ethernet: true, usb: true, mobilePrinting: true, wifiDirect: true },
    features: { scanner: true, fax: true, adf: true, borderlessPrinting: false }, duplex: "تلقائي", media: { cdDvdPrinting: false, plasticCardPrinting: false },
    colorCount: 1, printSpeed: 24, speedUnit: "ppm", adfCapacity: 50, photoPrintTimeSeconds: null, inkType: "DURABrite Ultra - Black Pigment Ink Pack",
    recommendedUses: ["شركات ومؤسسات", "مكاتب", "أعمال", "مجموعات عمل", "فواتير وسندات", "أحجام طباعة مرتفعة"], badge: "أحادية للأعمال",
    shortDescription: "طابعة WorkForce Pro أحادية اللون للأعمال، تجمع الطباعة والمسح والنسخ والفاكس مع ADF وطباعة مزدوجة تلقائية.",
    featuresList: ["طباعة أحادية للأعمال", "سرعة حتى 24 ppm", "ADF سعة 50 ورقة", "Duplex تلقائي", "Ethernet", "Wi-Fi Direct"],
    usesList: ["الشركات", "المكاتب", "مجموعات العمل", "الفواتير والسندات", "المستندات", "أحجام الطباعة المرتفعة"], whyChoose: "مناسبة لبيئات الأعمال التي تعتمد على المستندات الأحادية وتحتاج سرعة عالية وADF وفاكس واتصال شبكي متكامل.",
    legacyFeatures: "إنتاجية عالية, طباعة أحادية, اتصال شبكي, فاكس, ADF, Duplex تلقائي",
  }),
];

export function normalizedModelToken(value) {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function matchesModel(name, model) {
  return normalizedModelToken(name).endsWith(normalizedModelToken(model));
}

export function buildPlan(rows) {
  return PRINTER_SPECIFICATION_TARGETS.map((desired) => {
    const matches = rows.filter((row) => matchesModel(row.name, desired.model));
    return { desired, matches, status: matches.length === 0 ? "NOT FOUND" : "READY" };
  });
}

export function buildPatch(row, desired) {
  const currentContent = row.printer_page_content && typeof row.printer_page_content === "object" ? row.printer_page_content : {};
  return {
    printer_page_content: { ...currentContent, ...desired.pageContent },
  };
}

export function verifyPatch(row, patch) {
  return equalContent(row.printer_page_content, patch.printer_page_content);
}

async function loadRowsFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to read ${url}: HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.products ?? []).map((product) => ({
    id: product.id, name: product.name, badge: product.badge ?? null, description: product.description,
    features: product.features, specifications: product.specifications ?? null,
    printer_page_content: product.printerPageContent ?? null,
  }));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const inspect = process.argv.includes("--inspect");
  const sourceArg = process.argv.find((arg) => arg.startsWith("--source-url="));
  let client;
  let rows;
  if (sourceArg) {
    if (apply) throw new Error("--apply requires Supabase service credentials, not --source-url");
    rows = await loadRowsFromUrl(sourceArg.slice("--source-url=".length));
  } else {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("Missing Supabase URL or service/secret key");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.from("products").select("id,name,badge,description,features,specifications,printer_page_content").order("id");
    if (result.error) throw result.error;
    rows = result.data ?? [];
  }

  const beforeIds = rows.map((row) => String(row.id)).sort();
  const plan = buildPlan(rows);
  if (plan.some((item) => item.matches.length !== 1)) {
    const invalid = plan.filter((item) => item.matches.length !== 1).map((item) => `${item.desired.model}:${item.matches.length}`).join(", ");
    throw new Error(`Repair requires exactly one record per model; found ${invalid}`);
  }
  const targetIds = new Set(plan.flatMap((item) => item.matches.map((row) => String(row.id))));
  const protectedBefore = rows.filter((row) => !targetIds.has(String(row.id)));
  if (inspect) {
    for (const item of plan) {
      const identities = item.matches.map((row) => `${row.id} | ${row.name}`).join(" || ");
      console.log(`${item.desired.model}: ${identities || "NOT FOUND"}`);
    }
    const completedSample = rows.find((row) =>
      !PRINTER_SPECIFICATION_TARGETS.some((target) => matchesModel(row.name, target.model))
      && row.specifications && row.printer_page_content,
    );
    if (completedSample) {
      console.log(`Existing specification keys: ${Object.keys(completedSample.specifications).sort().join(",")}`);
      console.log(`Existing page content keys: ${Object.keys(completedSample.printer_page_content).sort().join(",")}`);
    }
  }
  const results = [];
  if (apply) {
    for (const item of plan) assertPrinterPageContent(item.desired.pageContent, `source.${item.desired.model}`);
    await mkdir(new URL("../tmp/", import.meta.url), { recursive: true });
    const backup = plan.map((item) => ({
      model: item.desired.model,
      id: item.matches[0].id,
      name: item.matches[0].name,
      printer_page_content: item.matches[0].printer_page_content,
    }));
    await writeFile(BACKUP_URL, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  }
  for (const item of plan) {
    if (item.status !== "READY") { results.push({ model: item.desired.model, status: item.status }); continue; }
    if (!apply) {
      results.push({ model: item.desired.model, status: item.matches.length === 1 ? "READY" : `${item.matches.length} RECORDS READY` });
      continue;
    }

    let verified = 0;
    for (const row of item.matches) {
      const patch = buildPatch(row, item.desired);
      assertPrinterPageContent(selectArabicContent(patch.printer_page_content), `pre-write.${item.desired.model}`);
      const update = await client.from("products").update(patch).eq("id", row.id).eq("name", row.name).select("id").maybeSingle();
      if (update.error) throw update.error;
      if (!update.data) throw new Error(`${item.desired.model}: guarded update did not match a record`);
      const verification = await client.from("products").select("id,name,badge,description,features,specifications,printer_page_content").eq("id", row.id).eq("name", row.name).maybeSingle();
      if (verification.error) throw verification.error;
      if (!verification.data) throw new Error(`${item.desired.model}: post-write record not found`);
      assertPrinterPageContent(selectArabicContent(verification.data.printer_page_content), `post-write.${item.desired.model}`);
      if (!verifyPatch(verification.data, patch)) throw new Error(`${item.desired.model}: post-write content mismatch`);
      verified += 1;
    }
    const status = verified !== item.matches.length
      ? "FAIL"
      : verified === 1
        ? "UPDATED + VERIFIED"
        : `${verified} RECORDS UPDATED + VERIFIED`;
    results.push({ model: item.desired.model, status });
  }

  if (apply) {
    const after = await client.from("products").select("id,name,badge,description,features,specifications,printer_page_content").order("id");
    if (after.error) throw after.error;
    const afterIds = (after.data ?? []).map((row) => String(row.id)).sort();
    if (!equalContent(beforeIds, afterIds)) throw new Error("Product identity set changed; database verification failed");
    const protectedAfter = (after.data ?? []).filter((row) => !targetIds.has(String(row.id)));
    if (!equalContent(protectedBefore, protectedAfter)) throw new Error("A non-target product changed; database verification failed");
    await rm(BACKUP_URL, { force: true });
  }
  for (const result of results) console.log(`${result.model}: ${result.status}`);
  if (!apply) console.log("DRY RUN: no products were changed");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
