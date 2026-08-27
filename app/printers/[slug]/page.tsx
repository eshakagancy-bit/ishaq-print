import type { Metadata } from "next";
import Image from "../../storefront-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteData } from "../../../lib/site-database";
import { getPrinterCategoryLabel } from "../../printer-categories";
import { buildQuickViewSpecificationRows } from "../../printer-specifications";
import { defaultSiteSettings, starterProducts, type StoredProduct } from "../../site-defaults";
import { getPrinterSlug } from "../product-slug";
import ProductGallery from "../../product-gallery";
import { isPublicCategoryEnabled } from "../../public-categories";
import { publicMetadata } from "../../seo";
import { productPriceLabel } from "../../product-commerce";
import ProductFavoriteButton from "../../product-favorite-button";
import StorefrontFooter from "../../storefront-footer";
import PublicSearchControl from "../../global-search-drawer";
import ProductShare from "../../product-share";
import { AddToCartButton, CartDrawerOverlay, CartHeaderButton } from "../../order-cart-ui";
import PublicTopBar from "../../public-topbar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRINTER_SPECIALIST_PHONE = "967778989866";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getPrinters() {
  if (!isPublicCategoryEnabled("printers")) return { printers: [], products: [], settings: defaultSiteSettings };
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  return {
    printers: data.products.filter((product) => product.category === "printers"),
    products: data.products,
    settings: data.settings,
  };
}

async function getPrinter(slug: string) {
  const { printers, products, settings } = await getPrinters();
  return {
    product: printers.find((printer) => getPrinterSlug(printer) === slug),
    printers,
    products,
    settings,
  };
}

function getWhatsappLink(product: StoredProduct, request: "quote" | "specialist") {
  const message = request === "quote"
    ? `مرحبًا مجموعة إسحاق العالمية، أريد طلب عرض سعر للطابعة: ${product.name}.`
    : `مرحبًا مجموعة إسحاق العالمية، أريد التواصل مع المختص بخصوص الطابعة: ${product.name}.`;
  return `https://wa.me/${PRINTER_SPECIALIST_PHONE}?text=${encodeURIComponent(message)}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getPrinter(slug);
  if (!product) return {};
  return publicMetadata({
    title: `${product.name} | وكالة إسحاق العالمية`,
    description: product.description || `تفاصيل ومواصفات ${product.name}`,
    path: `/printers/${slug}`,
    image: product.image || undefined,
  });
}

export default async function PrinterDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  const { product, printers, products, settings } = await getPrinter(slug);
  if (!product) notFound();

  const specificationRows = buildQuickViewSpecificationRows(product);
  const technicalRows = specificationRows.filter((row) => row.key !== "usage");
  const pageContent = product.printerPageContent;
  const keyInformation = technicalRows.slice(0, 6);
  const similarProducts = printers
    .filter((printer) => printer.id !== product.id && printer.printerCategory === product.printerCategory)
    .slice(0, 4);
  const purchaseBenefits = settings.productPurchaseBenefits;
  const visiblePurchaseBenefitItems = purchaseBenefits.items.filter((item) => item.title || item.description);
  const showPurchaseBenefits = Boolean(purchaseBenefits.title || purchaseBenefits.description || visiblePurchaseBenefitItems.length);

  return (
    <><main id="main-content" tabIndex={-1} className="printer-details-page">
      <PublicTopBar settings={settings}/>
      <header className="printer-details-header">
        <div className="container">
          <Link href="/printers" className="printer-back-link">العودة إلى الطابعات</Link>
          <Link href="/" aria-label="الصفحة الرئيسية">
            <Image src="/brand/eshak-logo.png" alt="مجموعة إسحاق العالمية" width={170} height={74} sizes="170px" loading="eager" fetchPriority="low" />
          </Link>
          <div className="detail-header-actions"><CartHeaderButton/><PublicSearchControl products={products} variant="icon"/></div>
        </div>
      </header>

      <section className="printer-hero">
        <div className="container">
          <nav className="product-details-breadcrumb" aria-label="مسار المنتج"><Link href="/">الرئيسية</Link><span>/</span><Link href="/printers">الطابعات</Link><span>/</span><b>{product.name}</b></nav>
        <div className="printer-hero-grid">
          <ProductGallery images={[product.image || "/brand/eshak-logo.png"]} alt={product.name} />
          <div className="printer-summary">
            {product.badge?.trim() && <span className="modal-product-badge">{product.badge}</span>}
            {product.family?.trim() && <span className="product-family">{product.family}</span>}
            <h1>{product.name}</h1>
            {product.description?.trim() && <p className="printer-summary-description">{product.description}</p>}
            <div className="printer-meta">
              {getPrinterCategoryLabel(product.printerCategory) && <span><small>الفئة</small><b>{getPrinterCategoryLabel(product.printerCategory)}</b></span>}
            </div>
            <div className="product-detail-price"><small>السعر</small><strong>{productPriceLabel(product.price)}</strong></div>
            {keyInformation.length > 0 && <dl className="printer-key-info">{keyInformation.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
            <div className="printer-actions">
              <AddToCartButton item={{ productType: "printer", productId: String(product.id), productName: product.name, productUrl: `/printers/${slug}`, image: product.image || "/brand/eshak-logo.png" }} />
              <a className="primary-btn" href={getWhatsappLink(product, "quote")} target="_blank" rel="noreferrer">اعرف السعر والتوفر</a>
              <a className="secondary-btn" href={getWhatsappLink(product, "specialist")} target="_blank" rel="noreferrer">تواصل مع المختص</a>
              <ProductFavoriteButton productId={product.id} />
              <ProductShare productName={product.name} productUrl={`/printers/${slug}`} />
              <Link className="printer-page-back" href="/printers">العودة إلى المنتجات</Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      <div className="container printer-sections">
        <nav className="product-section-nav" aria-label="أقسام تفاصيل المنتج">
          {pageContent?.detailedDescription && <a href="#description">الوصف</a>}
          {technicalRows.length > 0 && <a href="#specifications">المواصفات</a>}
          {pageContent?.productFeatures.length ? <a href="#features">المميزات</a> : null}
          {pageContent?.productUses.length ? <a href="#uses">الاستخدامات</a> : null}
          {pageContent?.whyChooseThisProduct && <a href="#why-product">لماذا تختاره</a>}
          {pageContent?.faq.some((item) => item.question) ? <a href="#faq">الأسئلة الشائعة</a> : null}
        </nav>
        {pageContent?.detailedDescription && <section id="description"><h2>الوصف</h2><div className="printer-long-copy">{pageContent.detailedDescription.split(/\r?\n\r?\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>}
        {pageContent?.productFeatures.length ? <section id="features"><h2>مميزات المنتج</h2><div className="printer-content-cards">{pageContent.productFeatures.map((feature, index) => <article key={`${feature.title}-${index}`}>{feature.title && <h3>{feature.title}</h3>}{feature.description && <p>{feature.description}</p>}</article>)}</div></section> : null}
        {technicalRows.length > 0 && <section id="specifications"><h2>المواصفات الفنية للمنتج</h2><div className="printer-spec-table-wrap"><table className="printer-spec-table"><tbody>{technicalRows.map((row) => <tr key={row.key}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div></section>}
        {pageContent?.productUses.length ? <section id="uses"><h2>استخدامات المنتج</h2><div className="printer-content-cards">{pageContent.productUses.map((use, index) => <article key={`${use.title}-${index}`}>{use.title && <h3>{use.title}</h3>}{use.description && <p>{use.description}</p>}</article>)}</div></section> : null}
        {pageContent?.whyChooseThisProduct && <section id="why-product"><h2>لماذا تختار هذا المنتج؟</h2><div className="printer-long-copy">{pageContent.whyChooseThisProduct.split(/\r?\n\r?\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></section>}
        {showPurchaseBenefits && <section className="purchase-benefits-section">{purchaseBenefits.title && <h2>{purchaseBenefits.title}</h2>}{purchaseBenefits.description && <p className="purchase-benefits-description">{purchaseBenefits.description}</p>}{visiblePurchaseBenefitItems.length > 0 && <div className="printer-content-cards">{visiblePurchaseBenefitItems.map((item, index) => <article key={`${item.title}-${index}`}>{item.title && <h3>{item.title}</h3>}{item.description && <p>{item.description}</p>}</article>)}</div>}</section>}
        {pageContent?.faq.some((item) => item.question) ? <section id="faq"><h2>الأسئلة الشائعة</h2><div className="printer-faq">{pageContent.faq.filter((item) => item.question).map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}</summary>{item.answer && <p>{item.answer}</p>}</details>)}</div></section> : null}
        {similarProducts.length > 0 && <section id="similar-products"><h2>منتجات مشابهة</h2><div className="similar-printers">{similarProducts.map((printer) => <Link href={`/printers/${getPrinterSlug(printer)}`} key={printer.id}><Image src={printer.image || "/brand/eshak-logo.png"} alt={printer.name} width={320} height={230} sizes="(max-width: 600px) 82vw, 240px" /><b>{printer.name}</b><span>{getPrinterCategoryLabel(printer.printerCategory)}</span></Link>)}</div></section>}
      </div>
      <CartDrawerOverlay/>
    </main><StorefrontFooter settings={settings} /></>
  );
}
