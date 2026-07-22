export const ADEN_TIME_ZONE = "Asia/Aden";

export const businessWeekdays = [
  { id: "sat", label: "السبت" },
  { id: "sun", label: "الأحد" },
  { id: "mon", label: "الاثنين" },
  { id: "tue", label: "الثلاثاء" },
  { id: "wed", label: "الأربعاء" },
  { id: "thu", label: "الخميس" },
  { id: "fri", label: "الجمعة" },
] as const;

export type BusinessWeekday = typeof businessWeekdays[number]["id"];

const validWeekdays = new Set<BusinessWeekday>(businessWeekdays.map((day) => day.id));
const weekdayFromIntl: Record<string, BusinessWeekday> = {
  Sat: "sat",
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
};

export function normalizeBusinessWeekdays(value: string, fallback = "sat,sun,mon,tue,wed,thu") {
  const days = [...new Set(value.split(",").map((day) => day.trim().toLowerCase()).filter((day): day is BusinessWeekday => validWeekdays.has(day as BusinessWeekday)))];
  return days.length ? days.join(",") : fallback;
}

export function normalizeBusinessTime(value: string, fallback: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return (hour * 60) + minute;
}

export function formatArabicBusinessHours(startTime: string, endTime: string) {
  const format = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    const period = hour < 12 ? "صباحًا" : "مساءً";
    const twelveHour = hour % 12 || 12;
    return `${twelveHour}:${String(minute).padStart(2, "0")} ${period}`;
  };
  return `${format(startTime)} – ${format(endTime)}`;
}

export function isOpenInAden(
  date: Date,
  settings: { workWeekdays: string; workStartTime: string; workEndTime: string },
) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: ADEN_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const weekday = weekdayFromIntl[part("weekday")];
  if (!weekday || weekday === "fri" || !normalizeBusinessWeekdays(settings.workWeekdays).split(",").includes(weekday)) return false;

  const currentMinutes = (Number(part("hour")) * 60) + Number(part("minute"));
  const startMinutes = timeToMinutes(normalizeBusinessTime(settings.workStartTime, "09:30"));
  const endMinutes = timeToMinutes(normalizeBusinessTime(settings.workEndTime, "22:00"));
  if (startMinutes <= endMinutes) return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 20);
}
