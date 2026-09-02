import { categoryImageDefinitions } from "../../site-defaults";
import { isPrinterCategory } from "../../printer-categories";
import { LASER_INK_CATEGORY, LASER_INK_COLOR_MODES, LASER_INK_TYPE } from "../../laser-inks";
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

const productKeys = ["id", "slug", "name", "family", "image", "images", "category", "printerCategory", "type", "size", "badge", "price", "description", "features", "specifications", "printerPageContent", "paperPageContent", "paperSpecifications", "inkSpecifications", "specificationsSourceUrl", "specificationsVerifiedAt", "sortOrder", "homeDisplayOrder", "models"];
const productModelKeys = ["id", "productId", "model", "partNumber", "color", "compatibility", "availability", "price", "image", "sortOrder", "isActive", "variants"];
const productModelVariantKeys = ["id", "productModelId", "color", "partNumber", "availability", "image", "sortOrder", "isActive"];
const settingsKeys = ["logoImage", "featureEyebrow", "featureTitle", "featureDescription", "featureImage", "maintenanceTitle", "maintenanceDescription", "contactKicker", "contactTitle", "address", "salesPhone", "customerServicePhone", "generalWhatsapp", "workDays", "workHours", "workWeekdays", "workStartTime", "workEndTime", "categoryImages", "productPurchaseBenefits"];
const pageContentKeys = ["detailedDescription", "productFeatures", "productUses", "whyChooseThisProduct", "faq"];
const contentItemKeys = ["title", "description"];
const faqKeys = ["question", "answer"];
const printerSpecificationKeys = ["paperSize", "printerType", "functions", "printTechnology", "colorCount", "colorMode", "wifi", "wifiAvailability", "wifiDirect", "nfc", "ethernet", "usb", "parallel", "serial", "optionalInterface", "scanner", "fax", "faxMode", "duplex", "duplexMode", "adf", "adfCapacity", "duplexScanning", "adfDuplexType", "printSpeed", "speedUnit", "inkType", "inkSystem", "borderless", "mobilePrinting", "cdDvdPrinting", "plasticCardPrinting", "photoPrintTimeSeconds", "usage", "printLanguages", "standardPaperCapacity", "maximumPaperCapacity", "finisherSupport", "dotMatrixPins", "printColumns", "multipartCopies", "ribbonYield"];
const paperSpecificationKeys = ["images", "nameAr", "nameEn", "brand", "series", "paperType", "surface", "size", "dimensions", "weightGsm", "sheetCount", "printSides", "printerCompatibility", "selfAdhesive", "thermalTransfer", "inkCompatibility", "quickDry", "uses", "availability"];
const inkSpecificationKeys = ["images", "variants", "brand", "inkType", "colorCount", "colorMode", "capacities", "compatiblePrinters", "features", "uses"];
const inkVariantKeys = ["code", "label", "image"];
const stringSettingsKeys = settingsKeys.slice(0, 18);
const validCategories = [...categoryImageDefinitions.map(({ key }) => key).filter((key) => key !== "all-products"), LASER_INK_CATEGORY];
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
  ["brand", "inkType", "colorCount", "colorMode"].forEach((key) => nullableString(input[key], `مواصفات الحبر.${key}`, 160));
  ["images", "capacities", "compatiblePrinters", "features", "uses"].forEach((key) => strictStringArray(input[key] ?? [], `مواصفات الحبر.${key}`, 50, 1000));
  const verifiedImages = new Set((input.images ?? []) as string[]);
  if (!Array.isArray(input.variants) || input.variants.length > 12) throw new AdminValidationError("ألوان الحبر غير صالحة");
  const codes = new Set<string>();
  input.variants.forEach((variant) => {
    const entry = strictObject(variant, inkVariantKeys, "لون الحبر");
    const code = requiredString(entry.code, "كود لون الحبر", 20).toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(code)) throw new AdminValidationError("كود لون الحبر غير صالح");
    if (codes.has(code)) throw new AdminValidationError("لا يمكن تكرار كود اللون داخل منتج الحبر");
    codes.add(code);
    requiredString(entry.label, "اسم لون الحبر", 80);
    const image = requiredString(entry.image, "صورة لون الحبر", 1000);
    safeWebOrLocalUrl(image, "صورة لون الحبر", 1000);
    if (!verifiedImages.has(image)) throw new AdminValidationError("صورة لون الحبر يجب أن تكون ضمن صور المنتج");
  });
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
  if (category === LASER_INK_CATEGORY) {
    const laserSpecifications = strictObject(product.inkSpecifications, inkSpecificationKeys, "مواصفات أحبار الليزر");
    requiredString(laserSpecifications.brand, "العلامة التجارية", 120);
    if (laserSpecifications.inkType !== LASER_INK_TYPE) throw new AdminValidationError("نوع حبر الليزر يجب أن يكون ليزر");
    enumValue(laserSpecifications.colorMode, LASER_INK_COLOR_MODES, "عدد ألوان حبر الليزر");
  }
  validatePageContent(product.printerPageContent, "محتوى صفحة الطابعة");
  validatePageContent(product.paperPageContent, "محتوى صفحة الورق");
  if (product.models !== undefined) {
    if (!Array.isArray(product.models) || product.models.length > 100) throw new AdminValidationError("موديلات المنتج غير صالحة");
    const names = new Set<string>();
    product.models.forEach((model, index) => {
      const entry = strictObject(model, productModelKeys, `موديل المنتج ${index + 1}`);
      const name = requiredString(entry.model, "اسم الموديل", 120).toLocaleLowerCase();
      if (names.has(name)) throw new AdminValidationError("لا يمكن تكرار نفس الموديل داخل المنتج");
      names.add(name);
      for (const [key, max] of [["partNumber", 120], ["color", 120], ["compatibility", 1000], ["price", 80], ["image", 1000]] as const) optionalString(entry[key], key, max);
      if (entry.image) safeWebOrLocalUrl(entry.image, "صورة الموديل", 1000);
      enumValue(entry.availability, ["in_stock", "out_of_stock", "on_request"], "توفر الموديل");
      if (typeof entry.isActive !== "boolean") throw new AdminValidationError("حالة الموديل غير صالحة");
      nullableNonNegativeNumber(entry.sortOrder, "ترتيب الموديل");
      if (entry.variants !== undefined && !Array.isArray(entry.variants)) throw new AdminValidationError("ألوان الموديل غير صالحة");
      const variants = Array.isArray(entry.variants) ? entry.variants : [];
      if (variants.length > 20) throw new AdminValidationError("عدد ألوان الموديل يتجاوز الحد المسموح");
      const colors = new Set<string>();
      variants.forEach((variant, variantIndex) => {
        const variantEntry = strictObject(variant, productModelVariantKeys, `لون الموديل ${variantIndex + 1}`);
        const color = requiredString(variantEntry.color, "لون الموديل", 80).toLocaleLowerCase();
        if (colors.has(color)) throw new AdminValidationError("لا يمكن تكرار اللون داخل نفس الموديل");
        colors.add(color);
        requiredString(variantEntry.partNumber, "Part Number للون", 120);
        enumValue(variantEntry.availability, ["in_stock", "out_of_stock", "on_request"], "توفر لون الموديل");
        if (typeof variantEntry.isActive !== "boolean") throw new AdminValidationError("حالة لون الموديل غير صالحة");
        nullableNonNegativeNumber(variantEntry.sortOrder, "ترتيب لون الموديل");
        optionalString(variantEntry.image, "صورة لون الموديل", 1000);
        if (variantEntry.image) safeWebOrLocalUrl(variantEntry.image, "صورة لون الموديل", 1000);
      });
      if (category === LASER_INK_CATEGORY) {
        const laserSpecifications = product.inkSpecifications as Record<string, unknown>;
        if (laserSpecifications.colorMode === "black" && !String(entry.partNumber ?? "").trim()) throw new AdminValidationError("Part Number مطلوب لكل موديل حبر ليزر أسود");
        if (laserSpecifications.colorMode === "color" && variants.length === 0) throw new AdminValidationError("يجب إضافة لون واحد على الأقل لكل موديل حبر ليزر ملون");
      }
    });
  }
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
