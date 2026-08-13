const YEMEN_INTERNATIONAL_PHONE = /^967\d{7,9}$/;

function normalizePhoneCandidate(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("00967")) return digits.slice(2);
  if (digits.startsWith("967")) return digits;
  if (digits.startsWith("0")) return `967${digits.slice(1)}`;
  return digits ? `967${digits}` : "";
}

export function normalizeYemenPhone(value: string, fallback = "") {
  const phone = normalizePhoneCandidate(value);
  if (YEMEN_INTERNATIONAL_PHONE.test(phone)) return phone;

  const fallbackPhone = normalizePhoneCandidate(fallback);
  if (YEMEN_INTERNATIONAL_PHONE.test(fallbackPhone)) return fallbackPhone;

  throw new Error("Invalid Yemen phone number");
}

export function yemenTelHref(value: string, fallback = "") {
  return `tel:+${normalizeYemenPhone(value, fallback)}`;
}

export function yemenWhatsappHref(value: string, message: string, fallback = "") {
  const phone = normalizeYemenPhone(value, fallback);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
