import {
  normalizeYemenPhone as normalizeYemenPhoneCore,
  yemenTelHref as yemenTelHrefCore,
  yemenWhatsappHref as yemenWhatsappHrefCore,
} from "./contact-links-core.js";

const CATALOG_SPECIALIST_WHATSAPP = "967778989866";

// Keep product inquiries with their existing department; cart orders and
// general inquiries have separate destinations.
const specialistContacts = {
  printers: CATALOG_SPECIALIST_WHATSAPP,
  inks: CATALOG_SPECIALIST_WHATSAPP,
  laser_inks: CATALOG_SPECIALIST_WHATSAPP,
  papers: CATALOG_SPECIALIST_WHATSAPP,
  laptops: "967772233043",
  electronics: "967772233043",
  cameras: "967772233043",
  "money-machines": "967772233043",
  networks: "967772233043",
  "3d-printers": "967777000725",
  "engraving-presses": "967777000725",
  "advertising-machines": "967777000725",
};

export function specialistWhatsappHref(category: keyof typeof specialistContacts, message: string) {
  return yemenWhatsappHref(specialistContacts[category], message);
}

export function normalizeYemenPhone(value: string, fallback = "") {
  return normalizeYemenPhoneCore(value, fallback);
}

export function yemenTelHref(value: string, fallback = "") {
  return yemenTelHrefCore(value, fallback);
}

export function yemenWhatsappHref(value: string, message: string, fallback = "") {
  return yemenWhatsappHrefCore(value, message, fallback);
}
