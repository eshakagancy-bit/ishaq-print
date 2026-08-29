import type { Metadata } from "next";
import Image from "../storefront-image";
import Link from "next/link";
import { getSiteData } from "../../lib/site-database";
import { defaultSiteSettings, starterProducts } from "../site-defaults";
import { publicMetadata } from "../seo";
import StorefrontFooter from "../storefront-footer";
import PublicSearchControl from "../global-search-drawer";
import { CartDrawerOverlay, CartHeaderButton } from "../order-cart-ui";
import PublicTopBar from "../public-topbar";
import StorefrontCategoryLinks from "../storefront-category-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicMetadata({
  title: "الفئات | وكالة إسحاق العالمية",
  description: "تصفح فئات الطابعات والأوراق والأحبار المتاحة لدى وكالة إسحاق العالمية.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const data = await getSiteData().catch(() => ({ settings: defaultSiteSettings, products: starterProducts }));
  return <><main id="main-content" tabIndex={-1} className="categories-index-page" dir="rtl">
    <PublicTopBar settings={data.settings}/>
    <header className="categories-index-header"><div className="container"><Link className="collection-brand" href="/"><Image src={data.settings.logoImage || "/brand/eshak-logo.png"} alt="وكالة إسحاق العالمية" width={160} height={70} sizes="160px" loading="eager" fetchPriority="low" /></Link><nav aria-label="التنقل الرئيسي"><Link href="/">الرئيسية</Link><Link href="/printers">الطابعات</Link><Link href="/inks">الأحبار</Link><Link href="/papers">الأوراق</Link></nav><div className="collection-header-actions"><CartHeaderButton compact/><PublicSearchControl products={data.products}/><Link className="categories-contact" href="/#contact">استشارات ومبيعات</Link></div></div></header>
    <section className="container categories-index-content">
      <nav className="collection-breadcrumb" aria-label="مسار الصفحة"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><b>الفئات</b></nav>
      <div className="categories-index-title"><span>أقسام المنتجات</span><h1>تسوق حسب الفئة</h1><p>اختر القسم الذي تريد تصفحه</p></div>
      <StorefrontCategoryLinks/>
    </section>
    <CartDrawerOverlay/></main><StorefrontFooter settings={data.settings} /></>;
}
