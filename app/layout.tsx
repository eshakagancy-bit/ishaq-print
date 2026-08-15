import type { Metadata } from "next";
import "./globals.css";
import { publicMetadata, SITE_NAME, SITE_URL } from "./seo";

const title = "وكالة إسحاق العالمية | طابعات إبسون والأوراق والأحبار";
const description = "وكالة إسحاق العالمية لحلول طباعة إبسون ومستلزماتها، من الطابعات والأوراق المتخصصة إلى الأحبار الموثوقة في اليمن.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...publicMetadata({ title, description, path: "/" }),
  authors: [{ name: "Engineer Ai / Adeeb Mohammed Ali" }],
  applicationName: SITE_NAME,
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
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth">
      <body><a className="skip-link" href="#main-content">تجاوز إلى المحتوى</a>{children}</body>
    </html>
  );
}
