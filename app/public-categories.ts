export const PUBLIC_ENABLED_CATEGORIES = [
  "printers",
  "papers",
  "inks",
  "laser_inks",
] as const;

const publicEnabledCategorySet = new Set<string>(PUBLIC_ENABLED_CATEGORIES);

export type PublicEnabledCategory = typeof PUBLIC_ENABLED_CATEGORIES[number];

export const PUBLIC_CATEGORY_DETAILS: Record<PublicEnabledCategory, {
  label: string;
  description: string;
  href: string;
}> = {
  printers: { label: "الطابعات", description: "طابعات وحلول طباعة تناسب المنازل والمكاتب والشركات.", href: "/printers" },
  papers: { label: "الأوراق", description: "أوراق طباعة وتصوير وخامات متخصصة لمختلف الاستخدامات.", href: "/papers" },
  inks: { label: "الأحبار", description: "أحبار متوافقة مع احتياجات الطباعة والاستخدامات المتنوعة.", href: "/inks" },
  laser_inks: { label: "أحبار الليزر", description: "أحبار ليزر للطابعات المكتبية والاحترافية بموديلات متعددة.", href: "/laser-inks" },
};

export function isPublicCategoryEnabled(category: string): category is PublicEnabledCategory {
  return publicEnabledCategorySet.has(category);
}

export function productBelongsToPublicCategory(productCategory: string, publicCategory: PublicEnabledCategory) {
  return productCategory === publicCategory;
}

export function isPublicCategoryUrl(url: string) {
  const category = url.match(/[?&]category=([a-z0-9_-]+)/)?.[1];
  return !category || isPublicCategoryEnabled(category);
}
