import type { Metadata } from "next";
import "./globals.css";

const siteUrl = new URL("https://ishaq-print-zeta.vercel.app");
const title = "وكالة إسحاق العالمية | طابعات إبسون وحلول الأعمال في اليمن";
const description = "وكالة إسحاق العالمية لحلول طباعة إبسون والتقنيات المكتبية وآلات الدعاية والإعلان، مع التوريد والتجهيز والدعم الفني في اليمن.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  authors: [{ name: "Engineer Ai / Adeeb Mohammed Ali" }],
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "وكالة إسحاق العالمية",
    locale: "ar_YE",
    type: "website",
    images: [{ url: "/brand/eshak-logo.png", width: 1200, height: 630, alt: "وكالة إسحاق العالمية" }],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
