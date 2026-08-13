import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteData } from "../../lib/site-database";
import { PUBLIC_CATEGORY_DETAILS, PUBLIC_ENABLED_CATEGORIES } from "../public-categories";
import { defaultSiteSettings, starterProducts } from "../site-defaults";
import { publicMetadata } from "../seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicMetadata({
  title: "الفئات | وكالة إسحاق العالمية",
  description: "تصفح فئات الطابعات والأوراق والأحبار المتاحة لدى وكالة إسحاق العالمية.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const data = await getSiteData().catch(() => ({ settings: defaultSiteSettings, products: starterProducts }));
  const categories = PUBLIC_ENABLED_CATEGORIES.map((category) => {
    const products = data.products.filter((product) => product.category === category);
    return {
      category,
      ...PUBLIC_CATEGORY_DETAILS[category],
      count: products.length,
      image: data.settings.categoryImages[category] || products[0]?.images?.[0] || products[0]?.image || data.settings.logoImage,
    };
  });

  return <main id="main-content" tabIndex={-1} className="categories-index-page" dir="rtl">
    <header className="categories-index-header"><div className="container"><Link href="/">العودة إلى الرئيسية</Link><Image src={data.settings.logoImage || "/brand/eshak-logo.png"} alt="وكالة إسحاق العالمية" width={160} height={70} sizes="160px" loading="eager" fetchPriority="low" /></div></header>
    <section className="container categories-index-content">
      <div className="categories-index-title"><span>أقسام المنتجات</span><h1>الفئات</h1><p>اختر القسم الذي تريد تصفحه</p></div>
      <div className="categories-index-grid">{categories.map((item) => <Link className="categories-index-card" data-category={item.category} href={item.href} key={item.category}>
        <div className="categories-index-image"><Image src={item.image || "/brand/eshak-logo.png"} alt={item.label} width={560} height={380} sizes="(max-width: 560px) calc(100vw - 56px), (max-width: 900px) 44vw, 360px" /></div>
        <div className="categories-index-card-content"><span>{item.count === 0 ? "لا توجد منتجات حاليًا" : `${item.count} ${item.count === 1 ? "منتج" : "منتجات"}`}</span><h2>{item.label}</h2><p>{item.description}</p><b>عرض المنتجات <i aria-hidden="true">←</i></b></div>
      </Link>)}</div>
    </section>
  </main>;
}
