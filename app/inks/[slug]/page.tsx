import type { Metadata } from "next";
import Image from "../../storefront-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteData } from "../../../lib/site-database";
import { buildInkSpecificationRows } from "../../ink-specifications";
import { defaultSiteSettings, starterProducts, type StoredProduct } from "../../site-defaults";
import { getInkSlug } from "../product-slug";
import { isPublicCategoryEnabled } from "../../public-categories";
import { publicMetadata } from "../../seo";
import { productPriceLabel } from "../../product-commerce";
import ProductFavoriteButton from "../../product-favorite-button";
import StorefrontFooter from "../../storefront-footer";
import PublicSearchControl from "../../global-search-drawer";
import PublicTopBar from "../../public-topbar";
import ProductShare from "../../product-share";
import InkVariantSelector from "../../ink-variant-selector";
import { CartDrawerOverlay, CartHeaderButton } from "../../order-cart-ui";
import ProductModelSelector from "../../product-model-selector";
import LaserInkModelSelector from "../../laser-ink-model-selector";
import { isInkCategory, isLaserInkCategory } from "../../laser-inks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }>; searchParams?: Promise<{ model?: string; color?: string }> };

async function getInkData(slug: string) {
  if (!isPublicCategoryEnabled("inks")) return { product: undefined, products: [], settings: defaultSiteSettings };
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  const inks = data.products.filter((product) => isInkCategory(product.category));
  return { product: inks.find((product) => getInkSlug(product) === slug), products: data.products, settings: data.settings };
}

function whatsappLink(product: StoredProduct) {
  const message = `مرحبًا وكالة إسحاق العالمية، أريد معرفة السعر والتوفر للحبر: ${product.name}.`;
  return `https://wa.me/967778989866?text=${encodeURIComponent(message)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getInkData(slug);
  return product ? publicMetadata({
    title: `${product.name} | وكالة إسحاق العالمية`,
    description: product.description || `تفاصيل ومواصفات ${product.name}`,
    path: `/inks/${slug}`,
    image: product.images?.[0] || product.image || undefined,
  }) : {};
}

export default async function InkDetailsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const requestedSelection = await searchParams;
  const requestedModel = requestedSelection?.model;
  const requestedColor = requestedSelection?.color;
  const { product, products, settings } = await getInkData(slug);
  if (!product) notFound();
  const rows = buildInkSpecificationRows(product);
  const specifications = product.inkSpecifications;
  const laserInk = isLaserInkCategory(product.category);
  const collectionHref = laserInk ? "/laser-inks" : "/inks";
  const collectionLabel = laserInk ? "أحبار الليزر" : "الأحبار";

  return <><main id="main-content" tabIndex={-1} className="printer-details-page">
    <PublicTopBar settings={settings}/>
    <header className="printer-details-header"><div className="container"><Link href={collectionHref} className="printer-back-link">العودة إلى {collectionLabel}</Link><Link href="/" aria-label="الصفحة الرئيسية"><Image src="/brand/eshak-logo.png" alt="وكالة إسحاق العالمية" width={170} height={74} sizes="170px" loading="eager" fetchPriority="low" /></Link><div className="detail-header-actions"><CartHeaderButton/><PublicSearchControl products={products} variant="icon"/></div></div></header>
    <section className="printer-hero"><div className="container">
      <nav className="product-details-breadcrumb" aria-label="مسار المنتج"><Link href="/">الرئيسية</Link><span>/</span><Link href={collectionHref}>{collectionLabel}</Link><span>/</span><b>{product.name}</b></nav>
      <div className="printer-hero-grid">
      {laserInk && specifications?.colorMode && product.models?.some((model) => model.isActive) ? <LaserInkModelSelector productId={String(product.id)} productName={product.name} productUrl={`/inks/${slug}`} productImage={product.image} models={product.models} colorMode={specifications.colorMode} requestedModel={requestedModel} requestedColor={requestedColor} /> : product.models?.some((model) => model.isActive) ? <ProductModelSelector models={product.models} requestedModel={requestedModel} productImage={product.image} productName={product.name} /> : <InkVariantSelector productId={String(product.id)} productName={product.name} productUrl={`/inks/${slug}`} variants={specifications?.variants ?? []} fallbackImages={product.images?.length ? product.images : [product.image || "/brand/eshak-logo.png"]} />}
      <div className="printer-summary">{product.badge?.trim() && <span className="modal-product-badge">{product.badge}</span>}<span className="product-family">{collectionLabel}</span><h1>{product.name}</h1>{product.description?.trim() && <p className="printer-summary-description">{product.description}</p>}{!laserInk && <div className="product-detail-price"><small>السعر</small><strong>{productPriceLabel(product.price)}</strong></div>}{rows.length > 0 && <dl className="printer-key-info">{rows.slice(0, 6).map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}<div className="printer-actions"><a className="primary-btn" href={whatsappLink(product)} target="_blank" rel="noreferrer">اعرف السعر والتوفر</a><a className="secondary-btn" href={whatsappLink(product)} target="_blank" rel="noreferrer">تواصل مع المختص</a><ProductFavoriteButton productId={product.id} /><ProductShare productName={product.name} productUrl={`/inks/${slug}`} /><Link className="printer-page-back" href={collectionHref}>العودة إلى المنتجات</Link></div></div>
    </div></div></section>
    <div className="container printer-sections">
      <nav className="product-section-nav" aria-label="أقسام تفاصيل المنتج">{product.description && <a href="#description">الوصف</a>}{rows.length > 0 && <a href="#specifications">المواصفات</a>}{specifications?.features.length ? <a href="#features">المميزات</a> : null}{specifications?.uses.length ? <a href="#uses">الاستخدامات</a> : null}</nav>
      {rows.length > 0 && <section id="specifications"><h2>المواصفات</h2><div className="printer-spec-table-wrap"><table className="printer-spec-table"><tbody>{rows.map((row) => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div></section>}
      {product.description && <section id="description"><h2>الوصف</h2><div className="printer-long-copy"><p>{product.description}</p></div></section>}
      {specifications?.features.length ? <section id="features"><h2>المميزات الرئيسية</h2><div className="printer-content-cards">{specifications.features.map((item, index) => <article key={`${item}-${index}`}><p>{item}</p></article>)}</div></section> : null}
      {specifications?.uses.length ? <section id="uses"><h2>الاستخدامات المناسبة</h2><div className="printer-content-cards">{specifications.uses.map((item, index) => <article key={`${item}-${index}`}><p>{item}</p></article>)}</div></section> : null}
    </div>
    <CartDrawerOverlay/><StorefrontFooter settings={settings} /></main></>;
}
