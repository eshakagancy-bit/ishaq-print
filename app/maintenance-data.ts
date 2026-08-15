import { yemenWhatsappHref } from "./contact-links";

export const maintenanceContacts = [
  { label: "الصيانة 1", phone: "967777103838", display: "777103838" },
  { label: "الصيانة 2", phone: "967781103838", display: "781103838" },
] as const;

export const maintenanceServices = [
  {
    title: "فحص الأعطال",
    description: "التواصل مع قسم الصيانة للاستفسار عن فحص الأعطال.",
  },
  {
    title: "صيانة ودعم فني",
    description: "التواصل مع القسم بشأن الصيانة والدعم الفني.",
  },
  {
    title: "متابعة سريعة",
    description: "استخدم أحد الرقمين المعتمدين لمتابعة استفسارك مع قسم الصيانة.",
  },
] as const;

const maintenanceWhatsappMessage = "مرحبًا، أريد التواصل مع قسم الصيانة في وكالة إسحاق العالمية.";

export function maintenanceWhatsappHref(phone: string) {
  return yemenWhatsappHref(phone, maintenanceWhatsappMessage);
}
