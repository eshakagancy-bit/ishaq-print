import {
  normalizeYemenPhone as normalizeYemenPhoneCore,
  yemenTelHref as yemenTelHrefCore,
  yemenWhatsappHref as yemenWhatsappHrefCore,
} from "./contact-links-core.js";

export function normalizeYemenPhone(value: string, fallback = "") {
  return normalizeYemenPhoneCore(value, fallback);
}

export function yemenTelHref(value: string, fallback = "") {
  return yemenTelHrefCore(value, fallback);
}

export function yemenWhatsappHref(value: string, message: string, fallback = "") {
  return yemenWhatsappHrefCore(value, message, fallback);
}
