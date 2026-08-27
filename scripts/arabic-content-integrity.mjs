export const ARABIC_CONTENT_FIELDS = [
  "detailedDescription",
  "productFeatures",
  "productUses",
  "whyChooseThisProduct",
  "faq",
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

export function equalContent(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

export function inspectArabicIntegrity(value) {
  const text = JSON.stringify(value);
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const suspiciousQuestionMarkSequences = (text.match(/\?{3,}/g) || []).length;
  return { arabicCount, suspiciousQuestionMarkSequences };
}

export function assertArabicIntegrity(value, context) {
  const result = inspectArabicIntegrity(value);
  if (result.suspiciousQuestionMarkSequences > 0) {
    throw new Error(`Arabic integrity failed for ${context}: suspicious question marks detected`);
  }
  if (result.arabicCount === 0) {
    throw new Error(`Arabic integrity failed for ${context}: no Arabic characters detected`);
  }
  return result;
}

export function assertPrinterPageContent(content, context) {
  if (!content || typeof content !== "object") {
    throw new Error(`Arabic integrity failed for ${context}: page content is missing`);
  }
  for (const field of ARABIC_CONTENT_FIELDS) {
    if (!(field in content)) throw new Error(`Arabic integrity failed for ${context}.${field}: field is missing`);
    assertArabicIntegrity(content[field], `${context}.${field}`);
  }
}

export function selectArabicContent(content) {
  return Object.fromEntries(ARABIC_CONTENT_FIELDS.map((field) => [field, content?.[field]]));
}
