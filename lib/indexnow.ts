import type { StoredProduct } from "../app/site-defaults";
import { SITE_URL } from "../app/seo-constants.js";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_HOST = "ishaq-print-zeta.vercel.app";
export const INDEXNOW_KEY = "a00dea81b5ead53c54a315f8cb2c85036feb03ce461f2d0b3f8a7e19d8c1f974";
export const INDEXNOW_KEY_LOCATION = `${SITE_URL}/${INDEXNOW_KEY}.txt`;

type ProductForIndexNow = Pick<StoredProduct, "id" | "name" | "category"> & { slug?: string };
type IndexNowFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Pick<Response, "ok" | "status">>;
type IndexNowLogger = Pick<Console, "error">;

export type IndexNowPayload = {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};

export type IndexNowResult = {
  submitted: boolean;
  urlList: string[];
  status?: number;
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getIndexNowProductUrl(product: ProductForIndexNow) {
  const nameSlug = slugify(product.name);
  if (product.category === "printers") {
    return `${SITE_URL}/printers/${product.id}-${nameSlug || "printer"}`;
  }
  if (product.category === "inks" || product.category === "laser_inks") {
    return `${SITE_URL}/inks/${product.id}-${nameSlug || "ink"}`;
  }
  if (product.category === "papers") {
    const paperSlug = product.slug?.trim() || `${product.id}-${nameSlug || "paper"}`;
    return `${SITE_URL}/papers/${paperSlug}`;
  }
  return null;
}

function normalizePublicUrl(value: string | URL) {
  let url: URL;
  try {
    url = value instanceof URL ? new URL(value.href) : new URL(value);
  } catch {
    return null;
  }

  if (url.origin !== SITE_URL || url.username || url.password || url.search || url.hash) return null;
  if (!/^\/(?:printers|inks|papers)\/[^/]+$/.test(url.pathname)) return null;
  return url.href;
}

function normalizeUrlList(urls: string | URL | readonly (string | URL)[]) {
  const values = Array.isArray(urls) ? urls : [urls];
  return [...new Set(values.map(normalizePublicUrl).filter((url): url is string => Boolean(url)))].slice(0, 10_000);
}

export function buildIndexNowPayload(urls: string | URL | readonly (string | URL)[]): IndexNowPayload | null {
  const urlList = normalizeUrlList(urls);
  if (!urlList.length) return null;
  return {
    host: INDEXNOW_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList,
  };
}

export async function submitIndexNowUrls(
  urls: string | URL | readonly (string | URL)[],
  fetchImpl: IndexNowFetch = fetch,
): Promise<IndexNowResult> {
  const payload = buildIndexNowPayload(urls);
  if (!payload) return { submitted: false, urlList: [] };

  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`IndexNow request failed with status ${response.status}`);
  return { submitted: true, urlList: payload.urlList, status: response.status };
}

export async function submitIndexNowUrlsSafely(
  urls: string | URL | readonly (string | URL)[],
  fetchImpl: IndexNowFetch = fetch,
  logger: IndexNowLogger = console,
): Promise<IndexNowResult> {
  try {
    return await submitIndexNowUrls(urls, fetchImpl);
  } catch (error) {
    logger.error("IndexNow submission failed after the product operation succeeded.", error);
    return { submitted: false, urlList: [] };
  }
}
