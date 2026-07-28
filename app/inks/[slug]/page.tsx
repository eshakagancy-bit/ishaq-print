import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteData } from "../../../lib/site-database";
import { buildInkSpecificationRows } from "../../ink-specifications";
import { defaultSiteSettings, starterProducts, type StoredProduct } from "../../site-defaults";
import { getInkSlug } from "../product-slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

async function getInk(slug: string) {
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  const inks = data.products.filter((product) => product.category === "inks");
  return inks.find((product) => getInkSlug(product) === slug);
}

function whatsappLink(product: StoredProduct) {
  const message = `مرحبًا وكالة إسحاق العالمية، أريد معرفة السعر والتوفر للحبر: ${product.name}.`;
  return `https://wa.me/967778989866?text=${encodeURIComponent(message)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getInk((await params).slug);
  return product ? { title: `${product.name} | وكالة إسحاق العالمية`, description: product.description } : {};
}

export default async function InkDetailsPage({ params }: PageProps) {
  const product = await getInk((await params).slug);
  if (!product) notFound();
  const rows = buildInkSpecificationRows(product);
  const specifications = product.inkSpecifications;

  return <main className="printer-details-page">
    <header className="printer-details-header"><div className="container"><Link href="/#products" className="printer-back-link">العودة إلى الأحبار</Link><Link href="/" aria-label="الصفحة الرئيسية"><Image src="/brand/eshak-logo.png" alt="وكالة إسحاق العالمية" width={170} height={74} priority /></Link></div></header>
    <section className="printer-hero"><div className="container printer-hero-grid">
      <div className="printer-gallery"><Image src={product.image || "/brand/eshak-logo.png"} alt={product.name} width={760} height={620} sizes="(max-width: 800px) 92vw, 48vw" priority /></div>
      <div className="printer-summary"><h1>{product.name}</h1>{rows.length > 0 && <dl className="printer-key-info">{rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}<div className="printer-actions"><a className="primary-btn" href={whatsappLink(product)} target="_blank" rel="noreferrer">{product.price?.trim() || "اطلب عرض سعر"}</a></div></div>
    </div></section>
    <div className="container printer-sections">
      {rows.length > 0 && <section><h2>المواصفات</h2><div className="printer-spec-table-wrap"><table className="printer-spec-table"><tbody>{rows.map((row) => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div></section>}
      {product.description && <section><h2>الوصف</h2><div className="printer-long-copy"><p>{product.description}</p></div></section>}
      {specifications?.features.length ? <section><h2>المميزات الرئيسية</h2><div className="printer-content-cards">{specifications.features.map((item, index) => <article key={`${item}-${index}`}><p>{item}</p></article>)}</div></section> : null}
      {specifications?.uses.length ? <section><h2>الاستخدامات المناسبة</h2><div className="printer-content-cards">{specifications.uses.map((item, index) => <article key={`${item}-${index}`}><p>{item}</p></article>)}</div></section> : null}
    </div>
  </main>;
}
