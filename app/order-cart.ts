import { normalizeYemenPhone } from "./contact-links-core.js";

export const ORDER_CART_STORAGE_KEY = "ishaq-order-cart-v1";
export const ORDER_CART_STORAGE_VERSION = 1;
export const ORDER_CART_SALES_NUMBER = "774666202";
export const ORDER_CART_SALES_INTERNATIONAL = normalizeYemenPhone(ORDER_CART_SALES_NUMBER);
export const INK_FULL_SET_VARIANT_CODE = "SET";
export const INK_FULL_SET_VARIANT_LABEL = "المجموعة الكاملة";

export type CartProductType = "printer" | "paper" | "ink";

export type CartVariant = {
  code: string;
  label: string;
};

export type CartItem = {
  key: string;
  productType: CartProductType;
  productId: string;
  productName: string;
  productUrl: string;
  image: string;
  quantity: number;
  variant?: CartVariant;
};

export type CartItemInput = Omit<CartItem, "key" | "quantity"> & { quantity?: number };

type CardProductCategory = "printers" | "papers" | "inks";

type ProductCardCartInput = {
  category: CardProductCategory;
  productId: string;
  productName: string;
  productUrl: string;
  image: string;
  inkVariantCount?: number;
};

export type ProductCardCartAction =
  | { kind: "add"; item: CartItemInput }
  | { kind: "choose-options"; href: string };

const productTypes: Record<CardProductCategory, CartProductType> = {
  printers: "printer",
  papers: "paper",
  inks: "ink",
};

export function buildProductCardCartAction(input: ProductCardCartInput): ProductCardCartAction {
  if (input.category === "inks" && (input.inkVariantCount ?? 0) > 0) {
    return { kind: "choose-options", href: input.productUrl };
  }

  return {
    kind: "add",
    item: {
      productType: productTypes[input.category],
      productId: input.productId,
      productName: input.productName,
      productUrl: input.productUrl,
      image: input.image,
      ...(input.category === "inks" ? {
        variant: { code: INK_FULL_SET_VARIANT_CODE, label: INK_FULL_SET_VARIANT_LABEL },
      } : {}),
    },
  };
}

const CART_PRODUCT_TYPES = new Set<CartProductType>(["printer", "paper", "ink"]);

function boundedQuantity(value: unknown) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 999 ? quantity : 1;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function buildCartItemKey(productType: CartProductType, productId: string, variantCode?: string) {
  return `${productType}:${productId}:${variantCode?.trim().toUpperCase() ?? ""}`;
}

export function createCartItem(input: CartItemInput): CartItem {
  const productId = cleanText(input.productId, 160);
  const variantCode = cleanText(input.variant?.code, 20).toUpperCase();
  const variant = input.variant ? {
    code: variantCode,
    label: variantCode === INK_FULL_SET_VARIANT_CODE
      ? INK_FULL_SET_VARIANT_LABEL
      : cleanText(input.variant.label, 80),
  } : undefined;
  if (input.productType === "ink" && (!variant?.code || !variant.label)) throw new Error("Ink cart items require a color variant");
  const productName = cleanText(input.productName, 200);
  const displayProductName = input.productType === "ink"
    && variant?.code === INK_FULL_SET_VARIANT_CODE
    && !productName.includes(INK_FULL_SET_VARIANT_LABEL)
      ? `${productName} — ${INK_FULL_SET_VARIANT_LABEL}`
      : productName;
  return {
    key: buildCartItemKey(input.productType, productId, variant?.code),
    productType: input.productType,
    productId,
    productName: displayProductName,
    productUrl: cleanText(input.productUrl, 500),
    image: cleanText(input.image, 1000),
    quantity: boundedQuantity(input.quantity),
    variant,
  };
}

export function addCartItem(items: CartItem[], input: CartItemInput) {
  const nextItem = createCartItem(input);
  const existingIndex = items.findIndex((item) => item.key === nextItem.key);
  if (existingIndex === -1) return [...items, nextItem];
  return items.map((item, index) => index === existingIndex
    ? { ...item, quantity: Math.min(999, item.quantity + nextItem.quantity) }
    : item);
}

export function setCartItemQuantity(items: CartItem[], key: string, quantity: number) {
  const nextQuantity = Number.isSafeInteger(quantity) ? Math.max(1, Math.min(999, quantity)) : 1;
  return items.map((item) => item.key === key ? { ...item, quantity: nextQuantity } : item);
}

export function removeCartItem(items: CartItem[], key: string) {
  return items.filter((item) => item.key !== key);
}

export function clearCartItems(): CartItem[] {
  return [];
}

export function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    const record = parsed as Record<string, unknown>;
    if (record.version !== ORDER_CART_STORAGE_VERSION || !Array.isArray(record.items)) return [];
    const seen = new Set<string>();
    return record.items.flatMap((raw): CartItem[] => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const item = raw as Record<string, unknown>;
      if (typeof item.productType !== "string" || !CART_PRODUCT_TYPES.has(item.productType as CartProductType)) return [];
      const productType = item.productType as CartProductType;
      const productId = cleanText(item.productId, 160);
      const productName = cleanText(item.productName, 200);
      const productUrl = cleanText(item.productUrl, 500);
      const image = cleanText(item.image, 1000);
      if (!productId || !productName || !productUrl.startsWith("/") || productUrl.startsWith("//") || !image.startsWith("/") || image.startsWith("//")) return [];
      let variant: CartVariant | undefined;
      if (productType === "ink") {
        if (!item.variant || typeof item.variant !== "object" || Array.isArray(item.variant)) return [];
        const rawVariant = item.variant as Record<string, unknown>;
        const code = cleanText(rawVariant.code, 20).toUpperCase();
        const label = cleanText(rawVariant.label, 80);
        if (!code || !label) return [];
        variant = { code, label };
      }
      const normalized = createCartItem({ productType, productId, productName, productUrl, image, quantity: item.quantity as number, variant });
      if (seen.has(normalized.key)) return [];
      seen.add(normalized.key);
      return [normalized];
    });
  } catch {
    return [];
  }
}

export function serializeCart(items: CartItem[]) {
  return JSON.stringify({ version: ORDER_CART_STORAGE_VERSION, items });
}

export function buildOrderMessage(items: CartItem[], origin: string) {
  const baseOrigin = origin.replace(/\/$/, "");
  const lines = items.flatMap((item, index) => [
    `${index + 1}. ${item.productName}`,
    ...(item.variant && item.variant.code !== INK_FULL_SET_VARIANT_CODE ? [`   اللون: ${item.variant.label} (${item.variant.code})`] : []),
    `   الكمية: ${item.quantity}`,
    `   الرابط: ${baseOrigin}${item.productUrl}`,
    "",
  ]);
  return [
    "مرحبًا، أريد طلب المنتجات التالية:",
    "",
    ...lines,
    "أرجو التواصل معي لتأكيد السعر والتوفر وبقية تفاصيل الطلب.",
  ].join("\n");
}

export function buildOrderWhatsAppUrl(items: CartItem[], origin: string) {
  return `https://wa.me/${ORDER_CART_SALES_INTERNATIONAL}?text=${encodeURIComponent(buildOrderMessage(items, origin))}`;
}
