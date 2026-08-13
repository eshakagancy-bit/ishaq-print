import type { Metadata } from "next";

export const SITE_URL = "https://ishaq-print-zeta.vercel.app";
export const SITE_NAME = "وكالة إسحاق العالمية";
export const DEFAULT_SOCIAL_IMAGE = "/brand/eshak-logo.png";

type PublicMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function publicMetadata({ title, description, path, image = DEFAULT_SOCIAL_IMAGE }: PublicMetadataInput): Metadata {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale: "ar_YE",
      type: "website",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
