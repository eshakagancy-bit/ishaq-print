import { categoryImageDefinitions } from "../../site-defaults";
import { isPrinterCategory } from "../../printer-categories";
import {
  AdminValidationError,
  enumValue,
  nullableBoolean,
  nullableNonNegativeNumber,
  nullableString,
  optionalString,
  positiveInteger,
  requiredString,
  safeWebOrLocalUrl,
  strictObject,
  strictStringArray,
} from "../admin-validation";

const productKeys = ["id", "slug", "name", "family", "image", "images", "category", "printerCategory", "type", "size", "badge", "price", "description", "features", "specifications", "printerPageContent", "paperPageContent", "paperSpecifications", "inkSpecifications", "specificationsSourceUrl", "specificationsVerifiedAt", "sortOrder", "homeDisplayOrder"];
const settingsKeys = ["logoImage", "featureEyebrow", "featureTitle", "featureDescription", "featureImage", "maintenanceTitle", "maintenanceDescription", "contactKicker", "contactTitle", "address", "salesPhone", "customerServicePhone", "generalWhatsapp", "workDays", "workHours", "workWeekdays", "workStartTime", "workEndTime", "categoryImages", "productPurchaseBenefits"];
const pageContentKeys = ["detailedDescription", "productFeatures", "productUses", "whyChooseThisProduct", "faq"];
const contentItemKeys = ["title", "description"];
const faqKeys = ["question", "answer"];
const printerSpecificationKeys = ["paperSize", "printerType", "functions", "printTechnology", "colorCount", "colorMode", "wifi", "wifiAvailability", "wifiDirect", "nfc", "ethernet", "usb", "parallel", "serial", "optionalInterface", "scanner", "fax", "faxMode", "duplex", "duplexMode", "adf", "adfCapacity", "duplexScanning", "adfDuplexType", "printSpeed", "speedUnit", "inkType", "inkSystem", "borderless", "mobilePrinting", "cdDvdPrinting", "plasticCardPrinting", "photoPrintTimeSeconds", "usage", "printLanguages", "standardPaperCapacity", "maximumPaperCapacity", "finisherSupport", "dotMatrixPins", "printColumns", "multipartCopies", "ribbonYield"];
const paperSpecificationKeys = ["images", "nameAr", "nameEn", "brand", "series", "paperType", "surface", "size", "dimensions", "weightGsm", "sheetCount", "printSides", "printerCompatibility", "selfAdhesive", "thermalTransfer", "inkCompatibility", "quickDry", "uses", "availability"];
const inkSpecificationKeys = ["images", "brand", "inkType", "colorCount", "capacities", "compatiblePrinters", "features", "uses"];
const stringSettingsKeys = settingsKeys.slice(0, 18);
const validCategories = categoryImageDefinitions.map(({ key }) => key).filter((key) => key !== "all-products");
const printerBooleanKeys = ["wifi", "wifiDirect", "nfc", "ethernet", "usb", "parallel", "serial", "optionalInterface", "scanner", "fax", "duplex", "adf", "duplexScanning", "borderless", "mobilePrinting", "cdDvdPrinting", "plasticCardPrinting", "finisherSupport"];
const printerNumberKeys = ["colorCount", "adfCapacity", "printSpeed", "photoPrintTimeSeconds", "standardPaperCapacity", "maximumPaperCapacity", "dotMatrixPins", "printColumns", "multipartCopies", "ribbonYield"];
const printerArrayKeys = ["functions", "usage", "printLanguages"];
const printerStringKeys = printerSpecificationKeys.filter((key) => !printerBooleanKeys.includes(key) && !printerNumberKeys.includes(key) && !printerArrayKeys.includes(key));

function validatePrinterSpecifications(value: unknown) {
  if (value === undefined || value === null) return;
  const input = strictObject(value, printerSpecificationKeys, "مواصفات الطابعة");
  printerBooleanKeys.forEach((key) => nullableBoolean(input[key], `مواصفات الطابعة.${key}`));
  printerNumberKeys.forEach((key) => nullableNonNegativeNumber(input[key], `مواصفات الطابعة.${key}`));
  printerArrayKeys.forEach((key) => strictStringArray(input[key] ?? [], `مواصفات الطابعة.${key}`, 12, 180));
  printerStringKeys.forEach((key) => nullableString(input[key], `مواصفات الطابعة.${key}`, 300));
}

function validatePaperSpecifications(value: unknown) {
  if (value === undefined || value === null) return;
  const input = strictObject(value, paperSpecificationKeys, "مواصفات الورق");
  ["nameAr", "nameEn", "brand", "series", "paperType", "surface", "size", "dimensions", "inkCompatibility"].forEach((key) => nullableString(input[key], `مواصفات الورق.${key}`, 180));
  ["weightGsm", "sheetCount"].forEach((key) => nullableNonNegativeNumber(input[key], `مواصفات الورق.${key}`));
  ["selfAdhesive", "thermalTransfer", "quickDry"].forEach((key) => nullableBoolean(input[key], `مواصفات الورق.${key}`));
  ["images", "printerCompatibility", "uses"].forEach((key) => strictStringArray(input[key] ?? [], `مواصفات الورق.${key}`, 12, 1000));
  if (input.printSides !== null && input.printSides !== undefined) enumValue(input.printSides, ["single", "double"], "عدد أوجه الورق");
  if (input.availability !== null && input.availability !== undefined) enumValue(input.availability, ["inStock", "outOfStock", "onRequest"], "توفر الورق");
}

function validateInkSpecifications(value: unknown) {
  if (value === undefined || value === null) return;
  const input = strictObject(value, inkSpecificationKeys, "مواصفات الحبر");
  ["brand", "inkType", "colorCount"].forEach((key) => nullableString(input[key], `مواصفات الحبر.${key}`, 160));
  ["images", "capacities", "compatiblePrinters", "features", "uses"].forEach((key) => strictStringArray(input[key] ?? [], `مواصفات الحبر.${key}`, 50, 1000));
}

function validatePageContent(value: unknown, label: string) {
  if (value === undefined) return;
  const content = strictObject(value, pageContentKeys, label);
  optionalString(content.detailedDescription, "الوصف التفصيلي", 20000);
  optionalString(content.whyChooseThisProduct, "سبب اختيار المنتج", 20000);
  for (const [key, keys, max] of [["productFeatures", contentItemKeys, 50], ["productUses", contentItemKeys, 50], ["faq", faqKeys, 50]] as const) {
    const items = content[key];
    if (!Array.isArray(items) || items.length > max) throw new AdminValidationError(`${label}.${key} غير صالح`);
    items.forEach((item) => {
      const entry = strictObject(item, keys, `${label}.${key}`);
      if (key === "faq") {
        requiredString(entry.question, "السؤال", 500, true);
        requiredString(entry.answer, "الإجابة", 5000, true);
      } else {
        requiredString(entry.title, "العنوان", 200, true);
        requiredString(entry.description, "الوصف", 4000, true);
      }
    });
  }
}

export function validateProductPayload(value: unknown) {
  const wrapper = strictObject(value, ["product"], "طلب المنتج");
  const product = strictObject(wrapper.product, productKeys, "المنتج");
  positiveInteger(product.id, "معرّف المنتج");
  requiredString(product.name, "اسم المنتج", 180);
  const category = requiredString(product.category, "الفئة", 80);
  enumValue(category, validCategories, "الفئة");
  for (const [key, max] of [["family", 120], ["image", 1000], ["type", 100], ["size", 100], ["description", 1200]] as const) requiredString(product[key], key, max, true);
  for (const [key, max] of [["slug", 200], ["badge", 80], ["price", 80], ["specificationsSourceUrl", 1000], ["specificationsVerifiedAt", 80]] as const) optionalString(product[key], key, max);
  if (product.slug !== undefined && product.slug !== "" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(product.slug as string)) throw new AdminValidationError("معرّف رابط المنتج غير صالح");
  strictStringArray(product.features, "المميزات", 8, 120);
  safeWebOrLocalUrl(product.image, "صورة المنتج", 1000);
  if (product.images !== undefined) {
    strictStringArray(product.images, "الصور", 50, 1000);
    (product.images as string[]).forEach((image) => safeWebOrLocalUrl(image, "صورة المنتج", 1000));
  }
  if (product.specificationsSourceUrl !== undefined) safeWebOrLocalUrl(product.specificationsSourceUrl, "مصدر المواصفات", 1000);
  if (product.printerCategory !== undefined && !isPrinterCategory(product.printerCategory)) throw new AdminValidationError("فئة الطابعة غير صالحة");
  if (product.sortOrder !== undefined) positiveInteger(product.sortOrder, "ترتيب المنتج", true);
  if (product.homeDisplayOrder !== undefined) positiveInteger(product.homeDisplayOrder, "ترتيب الرئيسية", true);
  validatePrinterSpecifications(product.specifications);
  validatePaperSpecifications(product.paperSpecifications);
  validateInkSpecifications(product.inkSpecifications);
  validatePageContent(product.printerPageContent, "محتوى صفحة الطابعة");
  validatePageContent(product.paperPageContent, "محتوى صفحة الورق");
  return wrapper;
}

export function validateSettingsPayload(value: unknown) {
  const wrapper = strictObject(value, ["settings"], "طلب الإعدادات");
  const settings = strictObject(wrapper.settings, settingsKeys, "الإعدادات");
  for (const key of stringSettingsKeys) requiredString(settings[key], key, 2000, true);
  ["logoImage", "featureImage"].forEach((key) => safeWebOrLocalUrl(settings[key], key, 2000));
  const images = strictObject(settings.categoryImages, categoryImageDefinitions.map(({ key }) => key), "صور الفئات");
  Object.values(images).forEach((image) => safeWebOrLocalUrl(image, "صورة الفئة", 2000));
  const benefits = strictObject(settings.productPurchaseBenefits, ["title", "description", "items"], "مزايا الشراء");
  requiredString(benefits.title, "عنوان مزايا الشراء", 300, true);
  requiredString(benefits.description, "وصف مزايا الشراء", 10000, true);
  if (!Array.isArray(benefits.items) || benefits.items.length > 30) throw new AdminValidationError("عناصر مزايا الشراء غير صالحة");
  benefits.items.forEach((item) => {
    const entry = strictObject(item, contentItemKeys, "عنصر مزايا الشراء");
    requiredString(entry.title, "عنوان ميزة الشراء", 200, true);
    requiredString(entry.description, "وصف ميزة الشراء", 4000, true);
  });
  return wrapper;
}

export function validateDeletePayload(value: unknown) {
  const wrapper = strictObject(value, ["id"], "طلب الحذف");
  positiveInteger(wrapper.id, "المعرّف");
  return wrapper;
}
