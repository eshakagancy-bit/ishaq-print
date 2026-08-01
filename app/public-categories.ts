export const PUBLIC_ENABLED_CATEGORIES = [
  "printers",
  "inks",
  "papers",
] as const;

const publicEnabledCategorySet = new Set<string>(PUBLIC_ENABLED_CATEGORIES);

export type PublicEnabledCategory = typeof PUBLIC_ENABLED_CATEGORIES[number];

export function isPublicCategoryEnabled(category: string): category is PublicEnabledCategory {
  return publicEnabledCategorySet.has(category);
}

export function isPublicCategoryUrl(url: string) {
  const category = url.match(/[?&]category=([a-z0-9-]+)/)?.[1];
  return !category || isPublicCategoryEnabled(category);
}
