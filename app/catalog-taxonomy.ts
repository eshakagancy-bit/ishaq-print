import type { PrinterCategory } from "./printer-categories";

export type TaxonomyProduct = {
  category: string;
  printerCategory?: PrinterCategory;
  family?: string;
};

export type TaxonomyMatcher = (product: TaxonomyProduct) => boolean;

export type TaxonomyNode = {
  id: string;
  slug: string;
  label: string;
  parentId: string | null;
  order: number;
  matcher: TaxonomyMatcher;
};

const matchesCategory = (category: string): TaxonomyMatcher =>
  (product) => product.category === category;

const matchesPrinterCategory = (...categories: PrinterCategory[]): TaxonomyMatcher =>
  (product) => product.category === "printers"
    && product.printerCategory !== undefined
    && categories.includes(product.printerCategory);

const matchesPrinterFamily = (family: string): TaxonomyMatcher => {
  const normalizedFamily = family.toLocaleLowerCase("en-US");
  return (product) => product.category === "printers"
    && product.printerCategory === "workforce"
    && product.family?.trim().toLocaleLowerCase("en-US") === normalizedFamily;
};

export const CATALOG_TAXONOMY: readonly TaxonomyNode[] = [
  { id: "printers", slug: "printers", label: "طابعات EPSON", parentId: null, order: 10, matcher: matchesCategory("printers") },
  { id: "workforce", slug: "workforce", label: "WorkForce", parentId: "printers", order: 10, matcher: matchesPrinterCategory("workforce") },
  { id: "workforce-pro", slug: "pro", label: "WorkForce Pro", parentId: "workforce", order: 10, matcher: matchesPrinterFamily("Epson WorkForce Pro") },
  { id: "workforce-enterprise", slug: "enterprise", label: "WorkForce Enterprise", parentId: "workforce", order: 20, matcher: matchesPrinterFamily("Epson WorkForce Enterprise") },
  { id: "ecotank", slug: "ecotank", label: "EcoTank", parentId: "printers", order: 20, matcher: matchesPrinterCategory("ecotank", "ecotank-6-color") },
  { id: "ecotank-standard", slug: "standard", label: "EcoTank", parentId: "ecotank", order: 10, matcher: matchesPrinterCategory("ecotank") },
  { id: "ecotank-six-color", slug: "six-color", label: "EcoTank 6 Color", parentId: "ecotank", order: 20, matcher: matchesPrinterCategory("ecotank-6-color") },
  { id: "lq", slug: "lq", label: "LQ", parentId: "printers", order: 30, matcher: matchesPrinterCategory("lq") },

  { id: "laptops", slug: "laptops", label: "اللابتوبات", parentId: null, order: 20, matcher: matchesCategory("laptops") },
  { id: "engraving-press", slug: "engraving-press", label: "آلات النحت والمكابس", parentId: null, order: 30, matcher: matchesCategory("engraving-presses") },
  { id: "inks", slug: "inks", label: "الأحبار", parentId: null, order: 40, matcher: matchesCategory("inks") },
  { id: "papers", slug: "papers", label: "الأوراق", parentId: null, order: 50, matcher: matchesCategory("papers") },
  { id: "advertising-machines", slug: "advertising-machines", label: "آلات الدعاية والإعلان", parentId: null, order: 60, matcher: matchesCategory("advertising-machines") },
  { id: "electronics-accessories", slug: "electronics-accessories", label: "الملحقات الإلكترونية", parentId: null, order: 70, matcher: matchesCategory("electronics") },
  { id: "cameras", slug: "cameras", label: "الكاميرات", parentId: null, order: 80, matcher: matchesCategory("cameras") },
  { id: "3d-printers", slug: "3d-printers", label: "طابعات ثلاثية الأبعاد", parentId: null, order: 90, matcher: matchesCategory("3d-printers") },
  { id: "money-counters", slug: "money-counters", label: "آلات عد وفحص النقود", parentId: null, order: 100, matcher: matchesCategory("money-machines") },
  { id: "networks", slug: "networks", label: "الشبكات وأجهزة الواي فاي", parentId: null, order: 110, matcher: matchesCategory("networks") },
] as const;

const taxonomyById = new Map(CATALOG_TAXONOMY.map((node) => [node.id, node]));

function resolveNode(nodeOrId: TaxonomyNode | string) {
  return typeof nodeOrId === "string"
    ? taxonomyById.get(nodeOrId) ?? getTaxonomyNodeByPath(nodeOrId)
    : nodeOrId;
}

export function getTaxonomyNodeByPath(path: string | readonly string[]) {
  const segments = (typeof path === "string" ? path.split("/") : [...path])
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments[0] === "categories") segments.shift();
  if (!segments.length) return undefined;

  let parentId: string | null = null;
  let current: TaxonomyNode | undefined;
  for (const slug of segments) {
    current = CATALOG_TAXONOMY.find((node) => node.parentId === parentId && node.slug === slug);
    if (!current) return undefined;
    parentId = current.id;
  }
  return current;
}

export function getChildren(parentOrId: TaxonomyNode | string | null) {
  const parentId = parentOrId === null
    ? null
    : typeof parentOrId === "string" ? resolveNode(parentOrId)?.id : parentOrId.id;
  if (parentOrId !== null && parentId === undefined) return [];
  return CATALOG_TAXONOMY
    .filter((node) => node.parentId === parentId)
    .sort((first, second) => first.order - second.order);
}

export function getAncestors(nodeOrId: TaxonomyNode | string) {
  const node = resolveNode(nodeOrId);
  if (!node) return [];

  const ancestors: TaxonomyNode[] = [];
  let parentId = node.parentId;
  while (parentId) {
    const parent = taxonomyById.get(parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    parentId = parent.parentId;
  }
  return ancestors;
}

export function matchProductsForNode<Product extends TaxonomyProduct>(
  nodeOrId: TaxonomyNode | string,
  products: readonly Product[],
) {
  const node = resolveNode(nodeOrId);
  return node ? products.filter((product) => node.matcher(product)) : [];
}
