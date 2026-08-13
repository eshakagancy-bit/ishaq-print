export class AdminValidationError extends Error {}

export function strictObject(value: unknown, allowedKeys: readonly string[], label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AdminValidationError(`${label} غير صالح`);
  const input = value as Record<string, unknown>;
  const unexpected = Object.keys(input).find((key) => !allowedKeys.includes(key));
  if (unexpected) throw new AdminValidationError(`الحقل غير المتوقع: ${unexpected}`);
  return input;
}

export function requiredString(value: unknown, label: string, maxLength: number, allowEmpty = false) {
  if (typeof value !== "string") throw new AdminValidationError(`${label} يجب أن يكون نصًا`);
  const result = value.trim();
  if ((!allowEmpty && !result) || result.length > maxLength) throw new AdminValidationError(`${label} غير صالح`);
  return result;
}

export function optionalString(value: unknown, label: string, maxLength: number) {
  if (value === undefined) return;
  if (typeof value !== "string" || value.length > maxLength) throw new AdminValidationError(`${label} غير صالح`);
}

export function nullableString(value: unknown, label: string, maxLength: number) {
  if (value === null || value === undefined) return;
  optionalString(value, label, maxLength);
}

export function strictBoolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new AdminValidationError(`${label} يجب أن يكون true أو false`);
}

export function positiveInteger(value: unknown, label: string, allowZero = false) {
  if (!Number.isSafeInteger(value) || (allowZero ? Number(value) < 0 : Number(value) <= 0)) throw new AdminValidationError(`${label} غير صالح`);
}

export function nullableNonNegativeNumber(value: unknown, label: string) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new AdminValidationError(`${label} غير صالح`);
}

export function nullableBoolean(value: unknown, label: string) {
  if (value !== null && value !== undefined && typeof value !== "boolean") throw new AdminValidationError(`${label} غير صالح`);
}

export function enumValue(value: unknown, allowed: readonly string[], label: string, nullable = false) {
  if (nullable && (value === null || value === undefined)) return;
  if (typeof value !== "string" || !allowed.includes(value)) throw new AdminValidationError(`${label} غير صالح`);
}

export function safeWebOrLocalUrl(value: unknown, label: string, maxLength = 2000, allowEmpty = true) {
  const result = requiredString(value, label, maxLength, allowEmpty);
  if (!result) return;
  if (result.startsWith("/") && !result.startsWith("//")) return;
  try {
    const url = new URL(result);
    if (url.protocol === "http:" || url.protocol === "https:") return;
  } catch {}
  throw new AdminValidationError(`${label} غير صالح`);
}

export function strictStringArray(value: unknown, label: string, maxItems: number, maxLength: number) {
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string" || item.length > maxLength)) {
    throw new AdminValidationError(`${label} غير صالح`);
  }
}

export function validationResponse(error: unknown) {
  if (error instanceof AdminValidationError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof SyntaxError) return Response.json({ error: "صيغة JSON غير صالحة" }, { status: 400 });
  return null;
}
