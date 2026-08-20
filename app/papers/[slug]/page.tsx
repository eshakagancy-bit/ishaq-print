import type { Metadata } from "next";
import Image from "../../storefront-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteData } from "../../../lib/site-database";
import { buildPaperSpecificationRows, getPaperAvailabilityLabel } from "../../paper-specifications";
import ProductGallery from "../../product-gallery";
import { defaultSiteSettings, starterProducts, type StoredProduct } from "../../site-defaults";
import { getPaperSlug } from "../product-slug";
import { isPublicCategoryEnabled } from "../../public-categories";
import { publicMetadata } from "../../seo";
import { productPriceLabel } from "../../product-commerce";
import ProductFavoriteButton from "../../product-favorite-button";
import StorefrontFooter from "../../storefront-footer";
import PublicSearchControl from "../../global-search-drawer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

async function getPaperData(slug: string) {
  if (!isPublicCategoryEnabled("papers")) return { product: undefined, papers: [], products: [], settings: defaultSiteSettings };
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  const papers = data.products.filter((item) => item.category === "papers");
  return { product: papers.find((item) => getPaperSlug(item) === slug), papers, products: data.products, settings: data.settings };
}

function whatsappLink(product: StoredProduct) {
  const message = `مرحبًا مجموعة إسحاق العالمية، أريد معرفة السعر والتوفر للورق: ${product.name}.`;
  return `https://wa.me/967778989866?text=${encodeURIComponent(message)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getPaperData(slug);
  const title = product?.paperSpecifications?.nameEn?.trim() || product?.name;
  return product ? publicMetadata({
    title: `${title} | وكالة إسحاق العالمية`,
    description: product.description || `تفاصيل ومواصفات ${title}`,
    path: `/papers/${slug}`,
    image: product.images?.[0] || product.image || undefined,
  }) : {};
}

export default async function PaperDetailsPage({ params }: PageProps) {
  const { product, papers, products, settings } = await getPaperData((await params).slug);
  if (!product) notFound();

  const title = product.paperSpecifications?.nameEn?.trim() || product.name;
  const rows = buildPaperSpecificationRows(product);
  const content = product.paperPageContent;
  const features = content?.productFeatures.length
    ? content.productFeatures
    : product.features.map((item) => ({ title: "", description: item }));
  const uses = content?.productUses.length
    ? content.productUses
    : (product.paperSpecifications?.uses ?? []).map((item) => ({ title: "", description: item }));
  const similar = papers
    .filter((item) => item.id !== product.id)
    .sort((a, b) => Number(b.paperSpecifications?.paperType === product.paperSpecifications?.paperType) - Number(a.paperSpecifications?.paperType === product.paperSpecifications?.paperType))
    .slice(0, 4);
  const images = product.images?.length
    ? product.images
    : product.paperSpecifications?.images?.length ? product.paperSpecifications.images : [product.image || "/brand/eshak-logo.png"];
  const availabilityLabel = getPaperAvailabilityLabel(product);

  return <><main id="main-content" tabIndex={-1} className="printer-details-page">
    <header className="printer-details-header"><div className="container"><Link href="/papers" className="printer-back-link">العودة إلى قسم الأوراق</Link><Link href="/" aria-label="الصفحة الرئيسية"><Image src="/brand/eshak-logo.png" alt="مجموعة إسحاق العالمية" width={170} height={74} sizes="170px" loading="eager" fetchPriority="low" /></Link><PublicSearchControl products={products} variant="icon"/></div></header>
    <section className="printer-hero"><div className="container">
      <nav className="product-details-breadcrumb" aria-label="مسار المنتج"><Link href="/">الرئيسية</Link><span>/</span><Link href="/papers">الأوراق</Link><span>/</span><b>{title}</b></nav>
      <div className="printer-hero-grid"><ProductGallery images={images} alt={title} /><div className="printer-summary">{product.badge?.trim() && <span className="modal-product-badge">{product.badge}</span>}{availabilityLabel && <span className="product-availability" data-availability>{availabilityLabel}</span>}<span className="product-family">الأوراق</span><h1 dir="ltr">{title}</h1>{product.description?.trim() && <p className="printer-summary-description">{product.description}</p>}<div className="product-detail-price"><small>السعر</small><strong>{productPriceLabel(product.price)}</strong></div>{rows.length > 0 && <dl className="printer-key-info">{rows.filter((row) => row.key !== "availability").slice(0, 6).map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}<div className="printer-actions"><a className="primary-btn" href={whatsappLink(product)} target="_blank" rel="noreferrer">اعرف السعر والتوفر</a><a className="secondary-btn" href={whatsappLink(product)} target="_blank" rel="noreferrer">تواصل مع المختص</a><ProductFavoriteButton productId={product.id} /><Link className="printer-page-back" href="/papers">العودة إلى قسم الأوراق</Link></div></div></div>
    </div></section>
    <div className="container printer-sections">
      <nav className="product-section-nav" aria-label="أقسام تفاصيل المنتج">{(content?.detailedDescription || product.description) && <a href="#description">الوصف</a>}{rows.length > 0 && <a href="#specifications">المواصفات</a>}{features.length > 0 && <a href="#features">المميزات</a>}{uses.length > 0 && <a href="#uses">الاستخدامات</a>}{content?.whyChooseThisProduct && <a href="#why-product">لماذا هذا المنتج؟</a>}{content?.faq.some((item) => item.question) && <a href="#faq">الأسئلة الشائعة</a>}</nav>
      {(content?.detailedDescription || product.description) && <section id="description"><h2>الوصف المختصر</h2><div className="printer-long-copy"><p>{content?.detailedDescription || product.description}</p></div></section>}
      {rows.length > 0 && <section id="specifications"><h2>المواصفات الكاملة</h2><div className="printer-spec-table-wrap"><table className="printer-spec-table"><tbody>{rows.map((row) => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div></section>}
      {features.length > 0 && <section id="features"><h2>المميزات</h2><div className="printer-content-cards">{features.map((item, index) => <article key={`${item.title}-${index}`}>{item.title && <h3>{item.title}</h3>}{item.description && <p>{item.description}</p>}</article>)}</div></section>}
      {uses.length > 0 && <section id="uses"><h2>الاستخدامات المناسبة</h2><div className="printer-content-cards">{uses.map((item, index) => <article key={`${item.title}-${index}`}>{item.title && <h3>{item.title}</h3>}{item.description && <p>{item.description}</p>}</article>)}</div></section>}
      {content?.whyChooseThisProduct && <section id="why-product"><h2>لماذا هذا المنتج؟</h2><div className="printer-long-copy"><p>{content.whyChooseThisProduct}</p></div></section>}
      {content?.faq.some((item) => item.question) && <section id="faq"><h2>الأسئلة الشائعة</h2><div className="printer-faq">{content.faq.filter((item) => item.question).map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}</summary>{item.answer && <p>{item.answer}</p>}</details>)}</div></section>}
      {similar.length > 0 && <section id="similar-products"><h2>منتجات ورقية مشابهة</h2><div className="similar-printers">{similar.map((item) => <Link href={`/papers/${getPaperSlug(item)}`} key={item.id}><Image src={item.images?.[0] || item.image || "/brand/eshak-logo.png"} alt={item.paperSpecifications?.nameEn || item.name} width={320} height={230} sizes="(max-width: 600px) 82vw, 240px" /><b>{item.paperSpecifications?.nameEn || item.name}</b><span>{item.paperSpecifications?.paperType || item.type}</span></Link>)}</div></section>}
    </div>
  </main><StorefrontFooter settings={settings} /></>;
}
