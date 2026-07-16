import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وكالة إسحاق العالمية | طابعات إبسون في اليمن",
  description: "حلول طباعة إبسون احترافية، توريد وتجهيز ودعم فني للشركات والمؤسسات في اليمن.",
  other: {
    "codex-preview": "development",
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
