import type { PrinterCategory } from "./printer-categories";

export type TriState = boolean | null;
export type DuplexMode = "none" | "manual" | "automatic" | null;

export type PrinterSpecifications = {
  paperSize: string | null;
  printerType: string | null;
  functions: string[];
  printTechnology: string | null;
  colorCount: number | null;
  colorMode: string | null;
  wifi: TriState;
  wifiDirect: TriState;
  ethernet: TriState;
  usb: TriState;
  parallel: TriState;
  serial: TriState;
  optionalInterface: TriState;
  scanner: TriState;
  fax: TriState;
  duplex: TriState;
  duplexMode: DuplexMode;
  adf: TriState;
  adfCapacity: number | null;
  printSpeed: number | null;
  speedUnit: string | null;
  inkType: string | null;
  borderless: TriState;
  mobilePrinting: TriState;
  cdDvdPrinting: TriState;
  plasticCardPrinting: TriState;
  photoPrintTimeSeconds: number | null;
  usage: string[];
  dotMatrixPins: number | null;
  printColumns: number | null;
  multipartCopies: number | null;
  ribbonYield: number | null;
};

export const PRINTER_FAMILY_OPTIONS = [
  "WorkForce Pro",
  "WorkForce Enterprise",
  "Epson EcoTank",
  "Epson EcoTank Photo",
  "Epson LQ",
  "Epson FX",
] as const;

export const PAPER_SIZE_OPTIONS = ["A4", "A3", "A3+", "A5", "ورق متصل 80 عمود", "ورق متصل 106 أعمدة", "أخرى"] as const;
export const PRINTER_TYPE_OPTIONS = ["طباعة فقط", "متعددة الوظائف", "طابعة صور", "متعددة الوظائف للصور", "طابعة نقطية"] as const;
export const PRINTER_FUNCTION_OPTIONS = ["طباعة", "نسخ", "مسح ضوئي", "فاكس"] as const;
export const SPEED_UNIT_OPTIONS = ["صفحة/دقيقة", "صورة/دقيقة", "حرف/ثانية"] as const;
export const INK_TYPE_OPTIONS = ["خزانات حبر", "أكياس حبر", "خراطيش حبر", "DURABrite ET صبغي", "Dye", "أسود صبغي وألوان Dye", "صبغي", "أسود صبغي، أسود صور، وألوان Dye", "شريط طباعة"] as const;
export const PRINTER_USAGE_OPTIONS = [
  "شخصي", "مكتبي", "شركات ومؤسسات", "تصوير فوتوجرافي", "فواتير وسندات",
  "مكاتب", "طباعة A3+", "أحجام طباعة مرتفعة", "أعمال", "مجموعات عمل",
  "تصوير احترافي", "صور A3+", "أقراص", "بطاقات", "منزلي", "مكتبي شخصي",
  "صور", "استوديوهات", "صور احترافية", "وسائط فنية",
] as const;
export const PRODUCT_BADGE_OPTIONS = ["", "الأكثر طلباً", "جديد", "موصى بها", "مناسبة للمكاتب", "مناسبة للشركات", "طباعة احترافية", "كمية محدودة"] as const;
export const PRICE_MODE_OPTIONS = [
  { value: "quote", label: "اطلب عرض سعر" },
  { value: "fixed", label: "سعر محدد" },
] as const;
export type PriceMode = typeof PRICE_MODE_OPTIONS[number]["value"];

export const TRI_STATE_OPTIONS = [
  { value: "unknown", label: "غير محدد" },
  { value: "yes", label: "نعم" },
  { value: "no", label: "لا" },
] as const;

export const DUPLEX_MODE_OPTIONS = [
  { value: "unknown", label: "غير محدد" },
  { value: "none", label: "لا يوجد" },
  { value: "manual", label: "يدوي" },
  { value: "automatic", label: "تلقائي" },
] as const;

export const BOOLEAN_SPECIFICATION_FIELDS = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "ethernet", label: "Ethernet" },
  { key: "usb", label: "USB" },
  { key: "mobilePrinting", label: "الطباعة من الجوال" },
  { key: "scanner", label: "ماسح ضوئي" },
  { key: "fax", label: "فاكس" },
  { key: "duplex", label: "طباعة تلقائية على الوجهين" },
  { key: "adf", label: "ADF" },
  { key: "borderless", label: "طباعة بدون حواف" },
] as const satisfies ReadonlyArray<{ key: keyof PrinterSpecifications; label: string }>;

export const LQ_INTERFACE_SPECIFICATION_FIELDS = [
  { key: "parallel", label: "منفذ متوازي Parallel" },
  { key: "serial", label: "منفذ تسلسلي Serial / RS-232" },
  { key: "optionalInterface", label: "يدعم واجهة اتصال اختيارية" },
] as const satisfies ReadonlyArray<{ key: keyof PrinterSpecifications; label: string }>;

export const ECOTANK_BOOLEAN_SPECIFICATION_FIELDS = [
  { key: "wifiDirect", label: "Wi-Fi Direct" },
  { key: "cdDvdPrinting", label: "طباعة CD/DVD" },
  { key: "plasticCardPrinting", label: "طباعة البطاقات البلاستيكية" },
] as const satisfies ReadonlyArray<{ key: keyof PrinterSpecifications; label: string }>;

export function createEmptyPrinterSpecifications(): PrinterSpecifications {
  return {
    paperSize: null,
    printerType: null,
    functions: [],
    printTechnology: null,
    colorCount: null,
    colorMode: null,
    wifi: null,
    wifiDirect: null,
    ethernet: null,
    usb: null,
    parallel: null,
    serial: null,
    optionalInterface: null,
    scanner: null,
    fax: null,
    duplex: null,
    duplexMode: null,
    adf: null,
    adfCapacity: null,
    printSpeed: null,
    speedUnit: null,
    inkType: null,
    borderless: null,
    mobilePrinting: null,
    cdDvdPrinting: null,
    plasticCardPrinting: null,
    photoPrintTimeSeconds: null,
    usage: [],
    dotMatrixPins: null,
    printColumns: null,
    multipartCopies: null,
    ribbonYield: null,
  };
}

function nullableText(value: unknown, maximumLength = 120) {
  const text = typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
  return text || null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function nullableBoolean(value: unknown): TriState {
  return typeof value === "boolean" ? value : null;
}

function nullableDuplexMode(value: unknown): DuplexMode {
  return value === "none" || value === "manual" || value === "automatic" ? value : null;
}

function stringList(value: unknown, allowed?: readonly string[]) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter((item) => item && (!allowed || allowed.includes(item))))].slice(0, 12);
}

export function normalizePrinterSpecifications(value: unknown): PrinterSpecifications | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const duplex = nullableBoolean(input.duplex);
  return {
    paperSize: nullableText(input.paperSize),
    printerType: nullableText(input.printerType),
    functions: stringList(input.functions, PRINTER_FUNCTION_OPTIONS),
    printTechnology: nullableText(input.printTechnology),
    colorCount: nullableNumber(input.colorCount),
    colorMode: nullableText(input.colorMode),
    wifi: nullableBoolean(input.wifi),
    wifiDirect: nullableBoolean(input.wifiDirect),
    ethernet: nullableBoolean(input.ethernet),
    usb: nullableBoolean(input.usb),
    parallel: nullableBoolean(input.parallel),
    serial: nullableBoolean(input.serial),
    optionalInterface: nullableBoolean(input.optionalInterface),
    scanner: nullableBoolean(input.scanner),
    fax: nullableBoolean(input.fax),
    duplex,
    duplexMode: nullableDuplexMode(input.duplexMode) ?? (duplex === true ? "automatic" : null),
    adf: nullableBoolean(input.adf),
    adfCapacity: nullableNumber(input.adfCapacity),
    printSpeed: nullableNumber(input.printSpeed),
    speedUnit: nullableText(input.speedUnit),
    inkType: nullableText(input.inkType),
    borderless: nullableBoolean(input.borderless),
    mobilePrinting: nullableBoolean(input.mobilePrinting),
    cdDvdPrinting: nullableBoolean(input.cdDvdPrinting),
    plasticCardPrinting: nullableBoolean(input.plasticCardPrinting),
    photoPrintTimeSeconds: nullableNumber(input.photoPrintTimeSeconds),
    usage: stringList(input.usage, PRINTER_USAGE_OPTIONS),
    dotMatrixPins: nullableNumber(input.dotMatrixPins),
    printColumns: nullableNumber(input.printColumns),
    multipartCopies: nullableNumber(input.multipartCopies),
    ribbonYield: nullableNumber(input.ribbonYield),
  };
}

export function triStateToFormValue(value: TriState) {
  return value === true ? "yes" : value === false ? "no" : "unknown";
}

export function formValueToTriState(value: string): TriState {
  return value === "yes" ? true : value === "no" ? false : null;
}

export function duplexModeToFormValue(value: DuplexMode) {
  return value ?? "unknown";
}

export function formValueToDuplexMode(value: string): DuplexMode {
  return value === "none" || value === "manual" || value === "automatic" ? value : null;
}

export function suggestPrinterFamily(category: PrinterCategory | undefined) {
  if (category === "workforce") return "WorkForce Pro";
  if (category === "ecotank") return "Epson EcoTank";
  if (category === "ecotank-6-color") return "Epson EcoTank Photo";
  if (category === "lq") return "Epson LQ";
  return "";
}

export function normalizeSpecificationsSourceUrl(value: unknown) {
  const text = typeof value === "string" ? value.trim().slice(0, 1000) : "";
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeSpecificationsVerifiedAt(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

type ProductSpecificationDisplayInput = {
  printerCategory?: PrinterCategory;
  specifications?: PrinterSpecifications;
  size?: string;
  type?: string;
  features?: string[];
};

export type SpecificationDisplayRow = {
  key: string;
  label: string;
  value: string;
  state?: boolean;
};

const speedUnitLabels: Record<string, string> = Object.fromEntries(SPEED_UNIT_OPTIONS.map((unit) => [unit, unit]));
const duplexModeLabels: Record<Exclude<DuplexMode, null>, string> = {
  none: "لا يوجد طباعة على الوجهين",
  manual: "طباعة يدوية على الوجهين",
  automatic: "طباعة تلقائية على الوجهين",
};

function yesNoRow(key: string, label: string, value: TriState): SpecificationDisplayRow | null {
  if (value === null) return null;
  return { key, label, value: value ? "نعم" : "لا", state: value };
}

function formatMultipartCopies(value: number) {
  return `أصل + ${value} نسخ`;
}

function formatRibbonYield(value: number) {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))} مليون حرف`;
  return `${value.toLocaleString("en-US")} حرف`;
}

export function getProductCardSpecificationTags(product: ProductSpecificationDisplayInput) {
  if (product.specifications) {
    return [product.specifications.paperSize, product.specifications.printerType].filter((value): value is string => Boolean(value));
  }
  return [product.size, product.type].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

export function buildQuickViewSpecificationRows(product: ProductSpecificationDisplayInput): SpecificationDisplayRow[] {
  const specifications = product.specifications;
  if (!specifications) {
    return [
      ...(product.size?.trim() ? [{ key: "legacy-paper-size", label: "مقاس الورق", value: product.size.trim() }] : []),
      ...(product.type?.trim() ? [{ key: "legacy-printer-type", label: "نوع الطابعة", value: product.type.trim() }] : []),
      ...(product.features ?? []).filter(Boolean).map((feature, index) => ({ key: `legacy-feature-${index}`, label: "ميزة", value: feature })),
    ];
  }

  const isDotMatrix = product.printerCategory === "lq" || specifications.printerType === "طابعة نقطية";
  const isEcoTank = product.printerCategory === "ecotank" || product.printerCategory === "ecotank-6-color";
  const functionValue = isDotMatrix && specifications.functions.length === 1 && specifications.functions[0] === "طباعة"
    ? "طباعة فقط"
    : specifications.functions.join("، ");
  const rows: Array<SpecificationDisplayRow | null> = [
    specifications.functions.length ? { key: "functions", label: "الوظائف", value: functionValue } : null,
    specifications.paperSize ? { key: "paper-size", label: "مقاس الورق", value: specifications.paperSize } : null,
    specifications.printerType ? { key: "printer-type", label: "نوع الطابعة", value: specifications.printerType } : null,
    specifications.printTechnology ? { key: "technology", label: "تقنية الطباعة", value: specifications.printTechnology } : null,
    yesNoRow("wifi", "Wi-Fi", specifications.wifi),
    isEcoTank ? yesNoRow("wifi-direct", "Wi-Fi Direct", specifications.wifiDirect) : null,
    yesNoRow("ethernet", "Ethernet", specifications.ethernet),
    yesNoRow("usb", "USB", specifications.usb),
    isDotMatrix ? yesNoRow("parallel", "منفذ متوازي Parallel", specifications.parallel) : null,
    isDotMatrix ? yesNoRow("serial", "منفذ تسلسلي Serial / RS-232", specifications.serial) : null,
    isDotMatrix ? yesNoRow("optional-interface", "يدعم واجهة اتصال اختيارية", specifications.optionalInterface) : null,
    !isDotMatrix ? yesNoRow("mobile-printing", "الطباعة من الجوال", specifications.mobilePrinting) : null,
    !isDotMatrix ? yesNoRow("scanner", "الماسح الضوئي", specifications.scanner) : null,
    !isDotMatrix ? yesNoRow("fax", "الفاكس", specifications.fax) : null,
    !isDotMatrix && specifications.duplexMode ? { key: "duplex-mode", label: "وضع الطباعة على الوجهين", value: duplexModeLabels[specifications.duplexMode] } : null,
    !isDotMatrix && !specifications.duplexMode ? yesNoRow("duplex", "الطباعة التلقائية على الوجهين", specifications.duplex) : null,
    !isDotMatrix ? yesNoRow("adf", "ADF", specifications.adf) : null,
    !isDotMatrix && specifications.adfCapacity !== null ? { key: "adf-capacity", label: "سعة ADF", value: `${specifications.adfCapacity}` } : null,
    !isDotMatrix && specifications.colorCount !== null ? { key: "color-count", label: "عدد الألوان", value: `${specifications.colorCount} ألوان` } : null,
    !isDotMatrix && specifications.colorMode ? { key: "color-mode", label: "نمط الألوان", value: specifications.colorMode } : null,
    !isEcoTank && specifications.printSpeed !== null ? {
      key: "print-speed",
      label: "سرعة الطباعة",
      value: `${specifications.printSpeed}${specifications.speedUnit ? ` ${speedUnitLabels[specifications.speedUnit] ?? specifications.speedUnit}` : ""}`,
    } : null,
    specifications.inkType ? { key: "ink-type", label: isDotMatrix ? "نوع المستهلك" : "نوع الحبر", value: specifications.inkType } : null,
    !isDotMatrix ? yesNoRow("borderless", "الطباعة بدون حواف", specifications.borderless) : null,
    isEcoTank ? yesNoRow("cd-dvd-printing", "طباعة CD/DVD", specifications.cdDvdPrinting) : null,
    isEcoTank ? yesNoRow("plastic-card-printing", "طباعة البطاقات البلاستيكية", specifications.plasticCardPrinting) : null,
    isEcoTank && specifications.photoPrintTimeSeconds !== null ? { key: "photo-print-time", label: "زمن طباعة الصورة", value: `${specifications.photoPrintTimeSeconds} ثانية` } : null,
    specifications.usage.length ? { key: "usage", label: "الاستخدام المناسب", value: specifications.usage.join("، ") } : null,
    isDotMatrix && specifications.dotMatrixPins !== null ? { key: "dot-matrix-pins", label: "عدد الإبر", value: `${specifications.dotMatrixPins}` } : null,
    isDotMatrix && specifications.printColumns !== null ? { key: "print-columns", label: "أعمدة الطباعة", value: `${specifications.printColumns}` } : null,
    isDotMatrix && specifications.multipartCopies !== null ? { key: "multipart-copies", label: "نسخ الورق المتعدد", value: formatMultipartCopies(specifications.multipartCopies) } : null,
    isDotMatrix && specifications.ribbonYield !== null ? { key: "ribbon-yield", label: "عمر الشريط", value: formatRibbonYield(specifications.ribbonYield) } : null,
  ];
  return rows.filter((row): row is SpecificationDisplayRow => Boolean(row));
}
