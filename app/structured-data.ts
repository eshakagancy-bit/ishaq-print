import type { StoredProduct } from "./site-defaults";
import { SITE_NAME, SITE_URL } from "./seo-constants.js";

type JsonLdObject = Record<string, unknown>;

type BreadcrumbItem = {
  name: string;
  path: string;
};

type ProductStructuredDataInput = {
  product: StoredProduct;
  name: string;
  description: string;
  path: string;
  category: string;
  images?: string[];
};

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const LOCAL_BUSINESS_ID = `${SITE_URL}/#localbusiness`;

const SOCIAL_PROFILE_URLS = [
  "https://www.instagram.com/eshak_gruop_agancy",
  "https://www.facebook.com/EshakAgency",
] as const;

export function absoluteSiteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, SITE_URL).toString();
}

function compactObject(entries: Array<[string, unknown]>) {
  return Object.fromEntries(entries.filter(([, value]) => {
    if (value === undefined || value === null || value === "") return false;
    return !Array.isArray(value) || value.length > 0;
  }));
}

export function buildHomeStructuredData(): JsonLdObject {
  const shared = {
    name: SITE_NAME,
    alternateName: "ESHAK INTERNATIONAL AGENCY",
    url: SITE_URL,
    logo: absoluteSiteUrl("/brand/eshak-logo.png"),
    telephone: "+967778989866",
    address: {
      "@type": "PostalAddress",
      streetAddress: "شارع صخر - بداية الدائري",
      addressLocality: "صنعاء",
      addressCountry: "YE",
    },
    areaServed: {
      "@type": "Country",
      name: "Yemen",
    },
    sameAs: [...SOCIAL_PROFILE_URLS],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        ...shared,
      },
      {
        "@type": "LocalBusiness",
        "@id": LOCAL_BUSINESS_ID,
        ...shared,
        parentOrganization: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

function productAdditionalProperties(product: StoredProduct) {
  return (product.models ?? [])
    .filter((model) => model.isActive)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.model.localeCompare(b.model))
    .flatMap((model) => [
      compactObject([
        ["@type", "PropertyValue"],
        ["name", "الموديل"],
        ["value", model.model.trim()],
      ]),
      ...(model.partNumber?.trim() ? [{
        "@type": "PropertyValue",
        name: `Part Number (${model.model.trim()})`,
        value: model.partNumber.trim(),
      }] : []),
      ...(model.compatibility?.trim() ? [{
        "@type": "PropertyValue",
        name: `التوافق (${model.model.trim()})`,
        value: model.compatibility.trim(),
      }] : []),
      ...(model.variants ?? [])
        .filter((variant) => variant.isActive && variant.partNumber.trim())
        .map((variant) => ({
          "@type": "PropertyValue",
          name: `Part Number (${model.model.trim()} - ${variant.color.trim()})`,
          value: variant.partNumber.trim(),
        })),
    ]);
}

export function buildProductStructuredData({
  product,
  name,
  description,
  path,
  category,
  images,
}: ProductStructuredDataInput): JsonLdObject {
  const activeModels = (product.models ?? []).filter((model) => model.isActive);
  const brand = product.paperSpecifications?.brand?.trim() || product.inkSpecifications?.brand?.trim();
  const imageUrls = [...new Set((images ?? [product.image]).filter(Boolean).map(absoluteSiteUrl))];

  return compactObject([
    ["@context", "https://schema.org"],
    ["@type", "Product"],
    ["@id", `${absoluteSiteUrl(path)}#product`],
    ["name", name.trim()],
    ["description", description.trim()],
    ["image", imageUrls],
    ["url", absoluteSiteUrl(path)],
    ["category", category],
    ["brand", brand ? { "@type": "Brand", name: brand } : undefined],
    ["model", activeModels.length === 1 ? activeModels[0].model.trim() : undefined],
    ["additionalProperty", productAdditionalProperties(product)],
  ]);
}

export function buildBreadcrumbStructuredData(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteSiteUrl(item.path),
    })),
  };
}

export function serializeStructuredData(data: JsonLdObject | JsonLdObject[]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function jsonLdScriptProps(data: JsonLdObject | JsonLdObject[]) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: serializeStructuredData(data) },
  };
}
