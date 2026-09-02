export const LASER_INK_CATEGORY = "laser_inks";
export const LASER_INK_TYPE = "ليزر";
export const LASER_INK_COLOR_MODES = ["black", "color"];
export const LASER_INK_COLOR_MODE_LABELS = { black: "أسود", color: "ملون" };
export const LASER_INK_COLORS = [
  { value: "black", label: "أسود" },
  { value: "cyan", label: "سماوي" },
  { value: "magenta", label: "أرجواني" },
  { value: "yellow", label: "أصفر" },
];

export function isLaserInkCategory(category) {
  return category === LASER_INK_CATEGORY;
}

export function isInkCategory(category) {
  return category === "inks" || isLaserInkCategory(category);
}

export function laserInkColorLabel(color) {
  const normalized = color.trim().toLocaleLowerCase();
  return LASER_INK_COLORS.find((option) => option.value === normalized)?.label || color.trim();
}
