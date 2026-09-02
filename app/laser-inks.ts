import type { ProductModel, ProductModelVariant, StoredProduct } from "./site-defaults";
import {
  LASER_INK_CATEGORY as CORE_CATEGORY,
  LASER_INK_COLOR_MODES as CORE_COLOR_MODES,
  LASER_INK_COLOR_MODE_LABELS as CORE_COLOR_MODE_LABELS,
  LASER_INK_COLORS as CORE_COLORS,
  LASER_INK_TYPE as CORE_TYPE,
  isInkCategory,
  isLaserInkCategory,
  laserInkColorLabel,
} from "./laser-inks-core.js";

export const LASER_INK_CATEGORY = CORE_CATEGORY as "laser_inks";
export const LASER_INK_TYPE = CORE_TYPE as "ليزر";
export const LASER_INK_COLOR_MODES = CORE_COLOR_MODES as unknown as readonly ["black", "color"];
export type LaserInkColorMode = typeof LASER_INK_COLOR_MODES[number];

export const LASER_INK_COLOR_MODE_LABELS = CORE_COLOR_MODE_LABELS as Record<LaserInkColorMode, string>;
export const LASER_INK_COLORS = CORE_COLORS as readonly { value: string; label: string }[];
export { isInkCategory, isLaserInkCategory, laserInkColorLabel };

export function activeModelVariants(model: Pick<ProductModel, "variants">) {
  return (model.variants ?? [])
    .filter((variant) => variant.isActive)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.color.localeCompare(b.color));
}

export function selectModelVariant(variants: ProductModelVariant[], requestedColor?: string) {
  const active = variants.filter((variant) => variant.isActive)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.color.localeCompare(b.color));
  if (!active.length) return undefined;
  const requested = requestedColor?.trim().toLocaleLowerCase();
  return active.find((variant) => variant.color.toLocaleLowerCase() === requested) ?? active[0];
}

export function isLaserInkProduct(product: Pick<StoredProduct, "category">) {
  return isLaserInkCategory(product.category);
}
