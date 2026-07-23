import { resolvePrinterCategory, type PrinterCategory } from "./printer-categories";
import type { PrinterSpecifications } from "./printer-specifications";

export type SiteSettings = {
  logoImage: string;
  featureEyebrow: string;
  featureTitle: string;
  featureDescription: string;
  featureImage: string;
  maintenanceTitle: string;
  maintenanceDescription: string;
  contactKicker: string;
  contactTitle: string;
  address: string;
  salesPhone: string;
  customerServicePhone: string;
  generalWhatsapp: string;
  workDays: string;
  workHours: string;
  workWeekdays: string;
  workStartTime: string;
  workEndTime: string;
};

export const defaultSiteSettings: SiteSettings = {
  logoImage: "/brand/eshak-logo.png",
  featureEyebrow: "حلول للشركات والمؤسسات",
  featureTitle: "من أول استشارة حتى تشغيل الطابعة",
  featureDescription: "لا نبيع جهازًا فقط؛ نساعدك على تحديد الفئة المناسبة حسب حجم العمل، مقاس الورق، وعدد المستخدمين.",
  featureImage: "/products/wf-c879r.png",
  maintenanceTitle: "تواصل مع قسم الصيانة",
  maintenanceDescription: "للفحص والصيانة والدعم الفني، اختر أحد الرقمين، وسيُفتح تطبيق واتساب أو تطبيق الاتصال مباشرة على جهازك.",
  contactKicker: "تبحث عن جهاز أو حل مناسب لعملك؟",
  contactTitle: "دعنا نساعدك في اختيار الحل الأنسب",
  address: "صنعاء – شارع صخر من جهة الدائري",
  salesPhone: "01472266",
  customerServicePhone: "967774666202",
  generalWhatsapp: "967777000725",
  workDays: "السبت – الخميس",
  workHours: "9:30 صباحًا – 10:00 مساءً",
  workWeekdays: "sat,sun,mon,tue,wed,thu",
  workStartTime: "09:30",
  workEndTime: "22:00",
};

export function normalizeLegacyArabicText(value: string) {
  return value
    .replace(/تقنيات وحلول\s{2}كبرى/g, "تقنيات وحلول متكاملة")
    .replace(new RegExp(["الإكسسوارات", "الإلكترونية"].join("\\s+"), "g"), "الملحقات الإلكترونية")
    .replace(/من جهة\s*\(الدائري\)/g, "من جهة الدائري")
    .replaceAll(
      "للفحص والصيانة والدعم الفني، اختر أحد الرقمين وسيفتح واتساب أو تطبيق الاتصال مباشرة من جهازك.",
      "للفحص والصيانة والدعم الفني، اختر أحد الرقمين، وسيُفتح تطبيق واتساب أو تطبيق الاتصال مباشرة على جهازك.",
    );
}

export function normalizeProductBrandName(value: string) {
  return value.trim();
}

export type StoredProduct = {
  id: number;
  name: string;
  family: string;
  image: string;
  category: string;
  printerCategory?: PrinterCategory;
  type: string;
  size: string;
  badge?: string;
  price?: string;
  description: string;
  features: string[];
  specifications?: PrinterSpecifications;
  specificationsSourceUrl?: string;
  specificationsVerifiedAt?: string;
  sortOrder?: number;
};

export type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  imageUrl: string;
  imageAlt: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  displayOrder: number;
  isActive: boolean;
};

export type HeroSettings = {
  autoplayEnabled: boolean;
  autoplayDelay: number;
  showArrows: boolean;
  showDots: boolean;
  pauseOnHover: boolean;
};

export const defaultHeroSettings: HeroSettings = {
  autoplayEnabled: true,
  autoplayDelay: 5000,
  showArrows: true,
  showDots: true,
  pauseOnHover: true,
};

export const defaultHeroSlides: HeroSlide[] = [
  {
    id: 1,
    title: "حلول طباعة احترافية لأعمال أكثر كفاءة",
    subtitle: "حلول الطباعة",
    description: "طابعات EPSON أصلية وتقنيات متطورة تلبي احتياجات الشركات والمكاتب.",
    badgeText: "طابعات EPSON",
    imageUrl: "/products/wf-c879r.png",
    imageAlt: "طابعة EPSON احترافية",
    primaryButtonText: "تصفح الطابعات",
    primaryButtonUrl: "#products",
    secondaryButtonText: "طلب عرض سعر",
    secondaryButtonUrl: "whatsapp",
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 2,
    title: "آلات الدعاية والإعلان",
    subtitle: "الدعاية والإعلان",
    description: "حلول متكاملة للطباعة والحفر والنحت والمكابس لمشاريع الدعاية والإنتاج.",
    badgeText: "معدات احترافية",
    imageUrl: "/hero/advertising-machines.png",
    imageAlt: "معدات دعاية وإعلان احترافية",
    primaryButtonText: "استعرض المنتجات",
    primaryButtonUrl: "#products?category=advertising-machines",
    secondaryButtonText: "تواصل معنا",
    secondaryButtonUrl: "#contact",
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 3,
    title: "تقنيات وحلول متكاملة",
    subtitle: "الحلول التقنية",
    description: "لابتوبات، شبكات، كاميرات، أجهزة إلكترونية ومنتجات تقنية مختارة.",
    badgeText: "تقنيات متكاملة",
    imageUrl: "/hero/technology-solutions.png",
    imageAlt: "حلول تقنية متكاملة تشمل لابتوب وشبكات وكاميرات",
    primaryButtonText: "تصفح الأقسام",
    primaryButtonUrl: "#categories",
    secondaryButtonText: "واتساب",
    secondaryButtonUrl: "whatsapp",
    displayOrder: 3,
    isActive: true,
  },
];

export const starterProducts: StoredProduct[] = [
  { id: 1, name: "EPSON WorkForce Pro EM-C800", family: "WorkForce Pro", image: "/products/em-c800.jpg", category: "printers", type: "متعددة الوظائف", size: "A4", badge: "الأكثر طلبًا", description: "طابعة أعمال ملونة ذكية تجمع الطباعة والنسخ والمسح والفاكس في جهاز واحد.", features: ["طباعة ملونة احترافية", "شاشة لمس سهلة", "طباعة ونسخ ومسح", "مناسبة لفرق العمل"], sortOrder: 1 },
  { id: 2, name: "EPSON WorkForce Pro WF-C579R", family: "WorkForce Pro RIPS", image: "/products/wf-c579r.jpg", category: "printers", type: "متعددة الوظائف", size: "A4", badge: "اقتصادية بالحبر", description: "حل مكتبي موثوق مصمم لأحجام الطباعة المرتفعة وتقليل مرات استبدال الحبر.", features: ["نظام حبر عالي السعة", "طباعة على الوجهين", "اتصال شبكي", "مهام متعددة"], sortOrder: 2 },
  { id: 3, name: "EPSON WorkForce Pro WF-C5390", family: "WorkForce Pro", image: "/products/wf-c5390.png", category: "printers", type: "طباعة فقط", size: "A4", badge: "للأعمال", description: "طابعة مكتبية ملونة سريعة ومدمجة للشركات التي تحتاج إنجازًا يوميًا ثابتًا.", features: ["ألوان واضحة", "تصميم مكتبي مدمج", "تشغيل سهل", "جاهزة للشبكات"], sortOrder: 3 },
  { id: 4, name: "EPSON WorkForce Pro WF-C878R", family: "WorkForce Pro RIPS", image: "/products/wf-c878r.webp", category: "printers", type: "متعددة الوظائف", size: "A3", badge: "طباعة A3", description: "منصة أعمال متكاملة تدعم مقاسات أكبر وتلائم الإدارات ومجموعات العمل النشطة.", features: ["تدعم مقاس A3", "نظام RIPS", "ماسح وناسخ", "إدارة ورق مرنة"], sortOrder: 4 },
  { id: 5, name: "EPSON WorkForce Pro WF-C879R", family: "WorkForce Pro RIPS", image: "/products/wf-c879r.png", category: "printers", type: "متعددة الوظائف", size: "A3", badge: "فئة احترافية", description: "طابعة متعددة الوظائف للشركات تجمع المرونة في التعامل مع الورق وكفاءة التشغيل.", features: ["طباعة A3 ملونة", "لوحة تحكم كبيرة", "سعة ورق قابلة للتوسعة", "مناسبة للأقسام"], sortOrder: 5 },
  { id: 6, name: "EPSON WorkForce Pro WF-C869R", family: "WorkForce Pro", image: "/products/wf-c869r.jpg", category: "printers", type: "متعددة الوظائف", size: "A3", description: "أداء مكتبي قوي للطباعة والنسخ والمسح مع تصميم عملي للاستخدام اليومي.", features: ["وظائف متكاملة", "واجهة استخدام واضحة", "طباعة شبكية", "مناسبة للمكاتب"], sortOrder: 6 },
  { id: 7, name: "EPSON WorkForce Pro EM-C800 + Tray", family: "WorkForce Pro", image: "/products/em-c800-tray.jpg", category: "printers", type: "متعددة الوظائف", size: "A4", badge: "سعة إضافية", description: "نسخة مجهزة بدرج إضافي لتوفير سعة ورق أكبر واستمرارية أفضل في بيئات العمل.", features: ["درج ورق إضافي", "مهام مكتبية متكاملة", "طباعة ملونة", "إنتاجية مستمرة"], sortOrder: 7 },
].map((product) => ({
  ...product,
  name: normalizeProductBrandName(product.name),
  printerCategory: resolvePrinterCategory(undefined, product.name),
}));
