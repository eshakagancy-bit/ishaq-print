"use client";

import Image, { getImageProps } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeMediaUrl } from "../lib/media-url";
import {
  defaultHeroSettings,
  defaultHeroSlides,
  defaultSiteSettings,
  type HeroSettings,
  type HeroSlide,
  type SiteSettings,
  type StoredProduct,
} from "./site-defaults";

const HERO_IMAGE_SIZES = "(max-width: 460px) 94vw, (max-width: 760px) 410px, (max-width: 1200px) 48vw, 600px";
const DEFAULT_IMAGE_SRC = "/brand/eshak-logo.png";
const allowedImagePrefixes = ["/api/media/", "/brand/", "/hero/", "/products/"];

type Product = {
  id: number;
  name: string;
  family: string;
  image: string;
  category: CategoryId;
  type: string;
  size: string;
  badge?: string;
  price?: string;
  description: string;
  features: string[];
};

type HomeClientProps = {
  initialSettings: SiteSettings;
  initialProducts: StoredProduct[];
  initialHeroSlides: HeroSlide[];
  initialHeroSettings: HeroSettings;
};

const categories = [
  { id: "printers", name: "طابعات EPSON", icon: "🖨️", description: "طابعات إبسون الأصلية للمكاتب والشركات" },
  { id: "laptops", name: "اللابتوبات", icon: "💻", description: "أجهزة محمولة للعمل والدراسة والاستخدام اليومي" },
  { id: "engraving-presses", name: "آلات النحت والمكابس", icon: "⚙️", description: "حلول النحت والكبس للمشاريع والورش" },
  { id: "inks", name: "الأحبار", icon: "💧", description: "أحبار أصلية وبدائل موثوقة لمختلف الاستخدامات" },
  { id: "papers", name: "الأوراق", icon: "📄", description: "أوراق الطباعة والتصوير والخامات المتخصصة" },
  { id: "advertising-machines", name: "آلات الدعاية والإعلان", icon: "✦", description: "معدات الطباعة والقص والإنتاج الإعلاني" },
  { id: "electronics", name: "الإكسسوارات الإلكترونية", icon: "🔌", description: "ملحقات إلكترونية عملية للأجهزة والمكاتب" },
  { id: "cameras", name: "الكاميرات", icon: "📷", description: "كاميرات ومعدات تصوير للاستخدامات المختلفة" },
  { id: "3d-printers", name: "طابعات ثلاثية الأبعاد", icon: "◈", description: "طابعات وخامات 3D للنماذج والمشاريع" },
  { id: "money-machines", name: "آلات عد وفحص النقود", icon: "💵", description: "أجهزة دقيقة للعد والكشف وفحص العملات" },
  { id: "networks", name: "الشبكات وأجهزة الواي فاي", icon: "◉", description: "راوترات ونقاط وصول وحلول ربط الشبكات" },
] as const;

type CategoryId = typeof categories[number]["id"];

function isCategoryId(value: string): value is CategoryId {
  return categories.some((category) => category.id === value);
}

function safeImageSrc(value: string | null | undefined) {
  const normalized = normalizeMediaUrl(value?.trim() ?? "");
  if (!normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("\\") || normalized.includes("?") || normalized.includes("#")) {
    return null;
  }

  let decoded = normalized;
  try {
    for (let index = 0; index < 4; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }
  if (decoded.includes("\\") || decoded.split("/").some((segment) => segment === "." || segment === "..")) return null;

  return allowedImagePrefixes.some((prefix) => decoded.startsWith(prefix)) ? normalized : null;
}

function imageSrcOrFallback(value: string | null | undefined, fallback = DEFAULT_IMAGE_SRC) {
  return safeImageSrc(value) ?? fallback;
}

function normalizeInitialProduct(product: StoredProduct): Product {
  return {
    ...product,
    image: imageSrcOrFallback(product.image),
    category: isCategoryId(product.category) ? product.category : "printers",
  };
}

const categoryContacts: Record<CategoryId, string> = {
  printers: "967778989866",
  inks: "967778989866",
  papers: "967778989866",
  laptops: "967772233043",
  electronics: "967772233043",
  cameras: "967772233043",
  "money-machines": "967772233043",
  networks: "967772233043",
  "3d-printers": "967777000725",
  "engraving-presses": "967777000725",
  "advertising-machines": "967777000725",
};

const maintenanceContacts = [
  { label: "الصيانة 1", phone: "967777103838", display: "777103838" },
  { label: "الصيانة 2", phone: "967781103838", display: "781103838" },
];

const starterProducts: Product[] = [
  {
    id: 1,
    name: "Epson WorkForce Pro EM-C800",
    family: "WorkForce Pro",
    image: "/products/em-c800.jpg",
    category: "printers",
    type: "متعددة الوظائف",
    size: "A4",
    badge: "الأكثر طلبًا",
    description: "طابعة أعمال ملونة ذكية تجمع الطباعة والنسخ والمسح والفاكس في جهاز واحد.",
    features: ["طباعة ملونة احترافية", "شاشة لمس سهلة", "طباعة ونسخ ومسح", "مناسبة لفرق العمل"],
  },
  {
    id: 2,
    name: "Epson WorkForce Pro WF-C579R",
    family: "WorkForce Pro RIPS",
    image: "/products/wf-c579r.jpg",
    category: "printers",
    type: "متعددة الوظائف",
    size: "A4",
    badge: "اقتصادية بالحبر",
    description: "حل مكتبي موثوق مصمم لأحجام الطباعة المرتفعة وتقليل مرات استبدال الحبر.",
    features: ["نظام حبر عالي السعة", "طباعة على الوجهين", "اتصال شبكي", "مهام متعددة"],
  },
  {
    id: 3,
    name: "Epson WorkForce Pro WF-C5390",
    family: "WorkForce Pro",
    image: "/products/wf-c5390.png",
    category: "printers",
    type: "طباعة فقط",
    size: "A4",
    badge: "للأعمال",
    description: "طابعة مكتبية ملونة سريعة ومدمجة للشركات التي تحتاج إنجازًا يوميًا ثابتًا.",
    features: ["ألوان واضحة", "تصميم مكتبي مدمج", "تشغيل سهل", "جاهزة للشبكات"],
  },
  {
    id: 4,
    name: "Epson WorkForce Pro WF-C878R",
    family: "WorkForce Pro RIPS",
    image: "/products/wf-c878r.webp",
    category: "printers",
    type: "متعددة الوظائف",
    size: "A3",
    badge: "طباعة A3",
    description: "منصة أعمال متكاملة تدعم مقاسات أكبر وتلائم الإدارات ومجموعات العمل النشطة.",
    features: ["تدعم مقاس A3", "نظام RIPS", "ماسح وناسخ", "إدارة ورق مرنة"],
  },
  {
    id: 5,
    name: "Epson WorkForce Pro WF-C879R",
    family: "WorkForce Pro RIPS",
    image: "/products/wf-c879r.png",
    category: "printers",
    type: "متعددة الوظائف",
    size: "A3",
    badge: "فئة احترافية",
    description: "طابعة متعددة الوظائف للشركات تجمع المرونة في التعامل مع الورق وكفاءة التشغيل.",
    features: ["طباعة A3 ملونة", "لوحة تحكم كبيرة", "سعة ورق قابلة للتوسعة", "مناسبة للأقسام"],
  },
  {
    id: 6,
    name: "Epson WorkForce Pro WF-C869R",
    family: "WorkForce Pro",
    image: "/products/wf-c869r.jpg",
    category: "printers",
    type: "متعددة الوظائف",
    size: "A3",
    description: "أداء مكتبي قوي للطباعة والنسخ والمسح مع تصميم عملي للاستخدام اليومي.",
    features: ["وظائف متكاملة", "واجهة استخدام واضحة", "طباعة شبكية", "مناسبة للمكاتب"],
  },
  {
    id: 7,
    name: "Epson WorkForce Pro EM-C800 + Tray",
    family: "WorkForce Pro",
    image: "/products/em-c800-tray.jpg",
    category: "printers",
    type: "متعددة الوظائف",
    size: "A4",
    badge: "سعة إضافية",
    description: "نسخة مجهزة بدرج إضافي لتوفير سعة ورق أكبر واستمرارية أفضل في بيئات العمل.",
    features: ["درج ورق إضافي", "مهام مكتبية متكاملة", "طباعة ملونة", "إنتاجية مستمرة"],
  },
];

const whatsapp = "967777000725";
function generalWaLink(phone: string) {
  const text = "مرحبًا وكالة إسحاق العالمية، أريد المساعدة في اختيار المنتج المناسب.";
  return `https://wa.me/${phone || whatsapp}?text=${encodeURIComponent(text)}`;
}

function specialistWaLink(categoryId: CategoryId, product?: Product) {
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const text = product
    ? `مرحبًا وكالة إسحاق العالمية، أريد معرفة السعر والتوفر للمنتج: ${product.name} من قسم ${category.name}`
    : `مرحبًا وكالة إسحاق العالمية، أريد التواصل مع مختص في قسم ${category.name}`;
  return `https://wa.me/${categoryContacts[categoryId]}?text=${encodeURIComponent(text)}`;
}

function maintenanceWaLink(phone: string) {
  const text = "مرحبًا، أريد التواصل مع قسم الصيانة في وكالة إسحاق العالمية.";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function normalizeYemenPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("967")) return digits;
  if (digits.startsWith("0")) return `967${digits.slice(1)}`;
  return `967${digits}`;
}

export default function HomeClient({
  initialSettings,
  initialProducts,
  initialHeroSlides,
  initialHeroSettings,
}: HomeClientProps) {
  const [settings] = useState<SiteSettings>(() => {
    const nextSettings = { ...defaultSiteSettings, ...initialSettings };
    return {
      ...nextSettings,
      logoImage: imageSrcOrFallback(nextSettings.logoImage),
      heroImage: imageSrcOrFallback(nextSettings.heroImage, defaultSiteSettings.heroImage),
      featureImage: safeImageSrc(nextSettings.featureImage) ?? "",
    };
  });
  const [heroSlides] = useState<HeroSlide[]>(() => {
    const slides = initialHeroSlides.length ? initialHeroSlides : defaultHeroSlides;
    const fallbackHeroImage = imageSrcOrFallback(defaultHeroSlides[0].imageUrl);
    return slides.map((slide) => ({
      ...slide,
      imageUrl: imageSrcOrFallback(slide.imageUrl, fallbackHeroImage),
    }));
  });
  const [heroSettings] = useState<HeroSettings>(() => ({ ...defaultHeroSettings, ...initialHeroSettings }));
  const [products] = useState<Product[]>(() => {
    const nextProducts = initialProducts.map(normalizeInitialProduct);
    return nextProducts.length ? nextProducts : starterProducts;
  });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("الكل");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("printers");
  const [selected, setSelected] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customerPhoneCopied, setCustomerPhoneCopied] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [outgoingHeroSlide, setOutgoingHeroSlide] = useState<number | null>(null);
  const [heroPaused, setHeroPaused] = useState(false);
  const heroTouchStartX = useRef<number | null>(null);
  const activeHeroSlideRef = useRef(0);
  const heroTransitionTimerRef = useRef<number | null>(null);
  const nextHeroPreloadRef = useRef<HTMLImageElement | null>(null);

  const customerPhone = normalizeYemenPhone(settings.customerServicePhone);
  const customerPhoneDisplay = customerPhone.replace(/^967/, "");
  const activeHero = heroSlides[activeHeroSlide] ?? defaultHeroSlides[0];
  const activeHeroImageSrc = imageSrcOrFallback(activeHero.imageUrl, defaultHeroSlides[0].imageUrl);
  const featureImageSrc = safeImageSrc(settings.featureImage);

  const showHeroSlide = useCallback((requestedIndex: number) => {
    if (heroSlides.length < 2) return;
    const nextIndex = (requestedIndex + heroSlides.length) % heroSlides.length;
    const currentIndex = activeHeroSlideRef.current;
    if (nextIndex === currentIndex) return;

    if (heroTransitionTimerRef.current !== null) {
      window.clearTimeout(heroTransitionTimerRef.current);
    }
    setOutgoingHeroSlide(currentIndex);
    activeHeroSlideRef.current = nextIndex;
    setActiveHeroSlide(nextIndex);
    heroTransitionTimerRef.current = window.setTimeout(() => {
      setOutgoingHeroSlide(null);
      heroTransitionTimerRef.current = null;
    }, 1500);
  }, [heroSlides.length]);

  const copyCustomerPhone = async () => {
    try {
      await navigator.clipboard.writeText(customerPhoneDisplay);
    } catch {
      const input = document.createElement("textarea");
      input.value = customerPhoneDisplay;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCustomerPhoneCopied(true);
    window.setTimeout(() => setCustomerPhoneCopied(false), 1800);
  };

  useEffect(() => {
    if (!heroSettings.autoplayEnabled || heroPaused || heroSlides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      showHeroSlide(activeHeroSlideRef.current + 1);
    }, heroSettings.autoplayDelay);
    return () => window.clearInterval(timer);
  }, [heroPaused, heroSettings.autoplayDelay, heroSettings.autoplayEnabled, heroSlides.length, showHeroSlide]);

  useEffect(() => () => {
    if (heroTransitionTimerRef.current !== null) {
      window.clearTimeout(heroTransitionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    let preloadTimer: number | null = null;
    const preloadNextHero = () => {
      preloadTimer = window.setTimeout(() => {
        const nextIndex = (activeHeroSlide + 1) % heroSlides.length;
        const src = imageSrcOrFallback(heroSlides[nextIndex]?.imageUrl, defaultHeroSlides[0].imageUrl);
        const { props } = getImageProps({ src, alt: "", fill: true, sizes: HERO_IMAGE_SIZES });
        const preloadImage = new window.Image();
        preloadImage.decoding = "async";
        preloadImage.fetchPriority = "low";
        preloadImage.sizes = props.sizes ?? HERO_IMAGE_SIZES;
        preloadImage.srcset = props.srcSet ?? "";
        preloadImage.src = props.src;
        nextHeroPreloadRef.current = preloadImage;
      }, 0);
    };

    if (document.readyState === "complete") preloadNextHero();
    else window.addEventListener("load", preloadNextHero, { once: true });

    return () => {
      window.removeEventListener("load", preloadNextHero);
      if (preloadTimer !== null) window.clearTimeout(preloadTimer);
    };
  }, [activeHeroSlide, heroSlides]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = product.category === activeCategory;
    const searchText = `${product.name} ${product.family} ${product.description}`.toLowerCase();
    const matchesQuery = searchText.includes(query.toLowerCase());
    const matchesFilter = activeCategory !== "printers" || filter === "الكل" ||
      (filter === "A3" && product.size === "A3") ||
      (filter === "A4" && product.size === "A4") ||
      (filter === "متعددة الوظائف" && product.type === "متعددة الوظائف") ||
      (filter === "طباعة فقط" && product.type === "طباعة فقط");
    return matchesCategory && matchesQuery && matchesFilter;
  }), [products, query, filter, activeCategory]);

  const currentCategory = categories.find((category) => category.id === activeCategory) ?? categories[0];

  const openCategory = (category: CategoryId) => {
    setActiveCategory(category);
    setFilter("الكل");
    setQuery("");
    window.setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  const heroButtonHref = (url: string) => url === "whatsapp" ? generalWaLink(settings.generalWhatsapp) : url.replace(/\?category=.*/, "");

  const handleHeroButtonClick = (url: string) => {
    const category = url.match(/category=([a-z0-9-]+)/)?.[1];
    if (category && categories.some((item) => item.id === category)) {
      openCategory(category as CategoryId);
    }
  };

  const changeHeroSlide = (step: number) => {
    if (!heroSlides.length) return;
    showHeroSlide(activeHeroSlideRef.current + step);
  };

  const handleHeroTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    heroTouchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleHeroTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (heroTouchStartX.current === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? heroTouchStartX.current;
    const distance = heroTouchStartX.current - touchEndX;
    if (Math.abs(distance) > 45) changeHeroSlide(distance > 0 ? 1 : -1);
    heroTouchStartX.current = null;
  };

  const toggleFavorite = (id: number) => setFavorites((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
  );

  return (
    <main dir="rtl">
      <div className="topbar">
        <div className="container topbar-inner">
          <span>📍 {settings.address}</span>
          <div className="topbar-links"><span>توصيل إلى جميع المحافظات</span><span className="topbar-customer"><a dir="ltr" href={`tel:+${customerPhone}`} aria-label={`الاتصال بخدمة العملاء على الرقم ${customerPhoneDisplay}`}>خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone} aria-label={`نسخ رقم خدمة العملاء ${customerPhoneDisplay}`}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ"}</button></span></div>
        </div>
      </div>

      <header className="header">
        <div className="container nav-wrap">
          <a href="#home" className="brand" aria-label="وكالة إسحاق العالمية"><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={190} height={78} sizes="(max-width: 760px) 140px, 194px" /></a>
          <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="التنقل الرئيسي">
            <a href="#home" onClick={() => setMenuOpen(false)}>الرئيسية</a>
            <a href="#categories" onClick={() => setMenuOpen(false)}>الأقسام</a>
            <a href="#maintenance" onClick={() => setMenuOpen(false)}>الصيانة</a>
            <a href="#services" onClick={() => setMenuOpen(false)}>خدماتنا</a>
            <a href="#products" onClick={() => { openCategory("printers"); setMenuOpen(false); }}>طابعات EPSON</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>تواصل معنا</a>
            <a href="/admin" className="mobile-admin-nav">لوحة التحكم</a>
          </nav>
          <div className="nav-actions">
            <button className="favorite-counter" aria-label={`المفضلة، ${favorites.length} منتجات`}><span>♡</span><b>{favorites.length}</b></button>
            <a className="admin-link" href="/admin">لوحة التحكم</a>
            <a className="nav-contact" href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">اطلب استشارة</a>
            <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="فتح القائمة"><span></span><span></span><span></span></button>
          </div>
        </div>
      </header>

      <section
        className="hero hero-slider"
        id="home"
        aria-roledescription="carousel"
        aria-label="العروض الرئيسية"
        onMouseEnter={() => heroSettings.pauseOnHover && setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        <div className="hero-glow hero-glow-one"></div><div className="hero-glow hero-glow-two"></div>
        <div className="hero-slide-stage">
          {heroSlides.map((slide, index) => (
            <article key={slide.id} className={index === activeHeroSlide ? "hero-slide active" : "hero-slide"} aria-hidden={index !== activeHeroSlide}>
              {(index === activeHeroSlide || index === outgoingHeroSlide) && <div className="hero-slide-bg-frame">
                <Image
                  src={imageSrcOrFallback(slide.imageUrl, defaultHeroSlides[0].imageUrl)}
                  alt=""
                  fill
                  sizes={HERO_IMAGE_SIZES}
                  className="hero-slide-bg"
                  aria-hidden="true"
                />
              </div>}
            </article>
          ))}
        </div>
        <div className="container hero-slider-content">
          <div className="hero-copy">
            <span className="eyebrow">{activeHero.subtitle}</span>
            <h1>{activeHero.title}</h1>
            <p>{activeHero.description}</p>
            <div className="hero-buttons">
              <a
                className="primary-btn"
                href={heroButtonHref(activeHero.primaryButtonUrl)}
                target={activeHero.primaryButtonUrl.startsWith("http") ? "_blank" : undefined}
                rel={activeHero.primaryButtonUrl.startsWith("http") ? "noreferrer" : undefined}
                onClick={() => handleHeroButtonClick(activeHero.primaryButtonUrl)}
              >
                {activeHero.primaryButtonText} <span>←</span>
              </a>
              <a
                className="secondary-btn"
                href={heroButtonHref(activeHero.secondaryButtonUrl)}
                target={activeHero.secondaryButtonUrl === "whatsapp" || activeHero.secondaryButtonUrl.startsWith("http") ? "_blank" : undefined}
                rel={activeHero.secondaryButtonUrl === "whatsapp" || activeHero.secondaryButtonUrl.startsWith("http") ? "noreferrer" : undefined}
                onClick={() => handleHeroButtonClick(activeHero.secondaryButtonUrl)}
              >
                {activeHero.secondaryButtonText}
              </a>
            </div>
            <div className="hero-trust"><div><strong>ضمان</strong><span>منتجات موثوقة</span></div><div><strong>دعم</strong><span>قبل وبعد البيع</span></div><div><strong>توريد</strong><span>حلول متكاملة</span></div></div>
          </div>
          <div className="hero-visual">
            <div className="brand-pill">{activeHero.badgeText}</div><div className="printer-halo"></div>
            <div className="hero-printer-frame">
              <Image
                src={activeHeroImageSrc}
                alt={activeHero.imageAlt || activeHero.title}
                fill
                sizes={HERO_IMAGE_SIZES}
                className="hero-printer"
                preload={activeHeroSlide === 0}
                fetchPriority={activeHeroSlide === 0 ? "high" : "auto"}
                loading={activeHeroSlide === 0 ? undefined : "eager"}
              />
            </div>
          </div>
        </div>
        {heroSettings.showArrows && <><button className="hero-arrow hero-arrow-next" type="button" onClick={() => changeHeroSlide(1)} aria-label="الشريحة التالية">›</button>
        <button className="hero-arrow hero-arrow-prev" type="button" onClick={() => changeHeroSlide(-1)} aria-label="الشريحة السابقة">‹</button></>}
        {heroSettings.showDots && <div className="hero-dots" role="tablist" aria-label="اختيار الشريحة">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={index === activeHeroSlide ? "active" : ""}
              onClick={() => showHeroSlide(index)}
              aria-label={`عرض الشريحة ${index + 1}`}
            ></button>
          ))}
        </div>}
      </section>

      <section className="search-panel-wrap"><div className="container search-panel">
        <div className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`ابحث داخل قسم ${currentCategory.name}...`} aria-label="البحث عن منتج" /></div>
        <div className="quick-points"><span>✓ أسعار منافسة</span><span>✓ منتجات موثوقة</span><span>✓ دعم فني متخصص</span></div>
      </div></section>

      <section className="categories-section" id="categories"><div className="container">
        <div className="center-heading categories-heading"><span className="section-kicker">أقسامنا التجارية</span><h2>اختر القسم الذي تبحث عنه</h2><p>تصفح الأقسام، ثم أضف المنتجات والصور والأسعار من لوحة التحكم بسهولة.</p></div>
        <div className="category-grid">
          {categories.map((category) => {
            const count = products.filter((product) => product.category === category.id).length;
            return <article key={category.id} className={activeCategory === category.id ? "category-card active" : "category-card"}>
              <button className="category-main" onClick={() => openCategory(category.id)}>
                <span className="category-icon" aria-hidden="true">{category.icon}</span>
                <span className="category-copy"><b>{category.name}</b><small>{category.description}</small></span>
                <span className="category-meta">{count ? `${count} منتجات` : "جاهز للإضافة"}<i>←</i></span>
              </button>
              <a className="category-specialist" href={specialistWaLink(category.id)} target="_blank" rel="noreferrer" aria-label={`تواصل مع مختص قسم ${category.name}`}><span>●</span> واتساب المختص: <b dir="ltr">{categoryContacts[category.id].replace("967", "")}</b></a>
            </article>;
          })}
        </div>
      </div></section>

      <section className="products-section" id="products"><div className="container">
        <div className="section-heading"><div><span className="section-kicker">{activeCategory === "printers" ? "طابعات إبسون فقط" : "منتجات القسم"}</span><h2>{currentCategory.name}</h2><p>{currentCategory.description}.</p></div><a className="specialist-heading-link" href={specialistWaLink(activeCategory)} target="_blank" rel="noreferrer"><span>●</span> واتساب المختص: <b dir="ltr">{categoryContacts[activeCategory].replace("967", "")}</b></a></div>
        {activeCategory === "printers" && <div className="filters" role="group" aria-label="تصنيف طابعات إبسون">{["الكل", "A4", "A3", "متعددة الوظائف", "طباعة فقط"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>}
        {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}>
          <div className="product-image">{product.badge && <span className="product-badge">{product.badge}</span>}<button className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label="إضافة إلى المفضلة">♥</button><Image src={imageSrcOrFallback(product.image)} alt={product.name} width={560} height={440} sizes="(max-width: 760px) 88vw, (max-width: 1000px) 44vw, 360px" loading="lazy" /><button className="quick-view" onClick={() => setSelected(product)}>عرض سريع</button></div>
          <div className="product-body"><span className="product-family">{product.family}</span><h3>{product.name}</h3><p>{product.description}</p><div className="product-tags"><span>{product.size}</span><span>{product.type}</span></div><div className="product-footer"><div className="price"><small>السعر</small><strong>{product.price || "اطلب عرض سعر"}</strong></div><a href={specialistWaLink(product.category, product)} target="_blank" rel="noreferrer">اطلب من المختص</a></div></div>
        </article>)}</div> : <div className="empty-state"><span className="empty-icon">{currentCategory.icon}</span><b>{query ? "لم نعثر على هذا المنتج" : `سيتم إضافة منتجات ${currentCategory.name} قريبًا`}</b><p>{query ? "جرّب البحث باسم آخر أو تواصل معنا وسنساعدك." : "سيتم إضافة منتجات هذا القسم من لوحة التحكم."}</p><div className="empty-actions"><button onClick={() => { setQuery(""); setFilter("الكل"); }}>{query ? "عرض جميع المنتجات" : "تحديث القسم"}</button></div></div>}
      </div></section>

      <section className="feature-band"><div className="container feature-band-inner">
        <div className="feature-image"><div className="cyan-disc"></div>{featureImageSrc && <Image src={featureImageSrc} alt="صورة البانر الدعائي" width={640} height={640} sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 540px" loading="lazy" />}</div>
        <div className="feature-copy"><span className="eyebrow dark">{settings.featureEyebrow}</span><h2>{settings.featureTitle}</h2><p>{settings.featureDescription}</p><ul><li><b>اختيار دقيق</b><span>ترشيح الموديل حسب احتياجك الفعلي.</span></li><li><b>توريد وتجهيز</b><span>تجهيز الطابعة وربطها ببيئة العمل.</span></li><li><b>دعم مستمر</b><span>مساندة فنية ومستلزمات تشغيل أصلية.</span></li></ul><a className="primary-btn" href={specialistWaLink("printers")} target="_blank" rel="noreferrer">تواصل مع مختص الطابعات <span>←</span></a></div>
      </div></section>

      <section className="services" id="services"><div className="container">
        <div className="center-heading"><span className="section-kicker">لماذا وكالة إسحاق؟</span><h2>خدمة متكاملة لقطاع الأعمال</h2></div>
        <div className="services-grid"><article><span>01</span><div className="service-icon">▣</div><h3>استشارات قبل الشراء</h3><p>نقارن لك الخيارات ونحدد الأنسب حسب طبيعة عملك وميزانيتك.</p></article><article><span>02</span><div className="service-icon">↯</div><h3>تجهيز وتركيب</h3><p>تهيئة الجهاز ومساعدتك على بدء الاستخدام بصورة صحيحة.</p></article><article><span>03</span><div className="service-icon">◉</div><h3>صيانة ودعم فني</h3><p>فريق متخصص لمتابعة الأعطال والصيانة الدورية والمستلزمات.</p></article><article><span>04</span><div className="service-icon">◇</div><h3>توصيل آمن وسريع</h3><p>تغليف وتجهيز مناسب مع توصيل داخل صنعاء وإلى المحافظات.</p></article></div>
      </div></section>

      <section className="maintenance-hero" id="maintenance">
        <div className="maintenance-orb maintenance-orb-one"></div><div className="maintenance-orb maintenance-orb-two"></div>
        <div className="container maintenance-grid">
          <div className="maintenance-copy">
            <span className="maintenance-kicker">مركز الخدمة والدعم الفني</span>
            <h2>{settings.maintenanceTitle}</h2>
            <p>{settings.maintenanceDescription}</p>
            <div className="maintenance-points"><span>✓ فحص الأعطال</span><span>✓ صيانة ودعم فني</span><span>✓ متابعة سريعة</span></div>
          </div>
          <div className="maintenance-contacts">
            {maintenanceContacts.map((contact) => <article className="maintenance-card" key={contact.phone}>
              <div className="maintenance-card-head"><span className="maintenance-icon">☎</span><div><small>{contact.label}</small><strong dir="ltr">{contact.display}</strong></div></div>
              <div className="maintenance-actions">
                <a className="maintenance-whatsapp" href={maintenanceWaLink(contact.phone)} target="_blank" rel="noreferrer" aria-label={`واتساب ${contact.label} على الرقم ${contact.display}`}><span>●</span> واتساب</a>
                <a className="maintenance-call" href={`tel:+${contact.phone}`} aria-label={`اتصال هاتفي بـ ${contact.label} على الرقم ${contact.display}`}>اتصال هاتفي</a>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="contact-banner" id="contact"><div className="container contact-banner-inner"><div><span>{settings.contactKicker}</span><h2>{settings.contactTitle}</h2></div><div className="contact-actions"><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">واتساب: {settings.generalWhatsapp.replace("967", "")}</a><a href={`tel:+${customerPhone}`} className="outline" dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم نسخ الرقم ✓" : "نسخ الرقم"}</button></div></div></section>

      <footer><div className="container footer-grid">
        <div className="footer-brand"><Image src={imageSrcOrFallback(settings.logoImage)} alt="وكالة إسحاق العالمية" width={210} height={90} sizes="190px" loading="lazy" /><p>حلول تقنية وتجارية وتجهيزات موثوقة للأفراد والشركات والمؤسسات في اليمن.</p></div>
        <div><h3>روابط سريعة</h3><a href="#home">الرئيسية</a><a href="#categories">جميع الأقسام</a><a href="#maintenance">الصيانة</a><a href="#products">طابعات EPSON</a><a href="#services">خدماتنا</a></div>
        <div><h3>تواصل معنا</h3><a href={`tel:+${customerPhone}`} dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button className="footer-copy-phone" type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ الرقم"}</button><a href={`tel:${settings.salesPhone}`}>{settings.salesPhone}</a><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">{settings.generalWhatsapp.replace("967", "")}</a><p>{settings.address}</p></div>
        <div><h3>أوقات العمل</h3><p>{settings.workDays}</p><p>{settings.workHours}</p><span className="open-label">● متاحون الآن</span></div>
      </div><div className="container copyright"><span>© 2026 وكالة إسحاق العالمية. جميع الحقوق محفوظة.</span><span>EPSON وWorkForce علامات تجارية لأصحابها.</span></div></footer>

      <a className="whatsapp-float" href={specialistWaLink(activeCategory)} target="_blank" rel="noreferrer" aria-label={`تواصل مع مختص قسم ${currentCategory.name}`}>مختص القسم <span>◉</span></a>
      {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}><div className="product-modal" role="dialog" aria-modal="true" aria-label={`تفاصيل ${selected.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="إغلاق">×</button><div className="modal-image"><Image src={imageSrcOrFallback(selected.image)} alt={selected.name} width={700} height={600} sizes="(max-width: 760px) 90vw, 405px" loading="eager" /></div><div className="modal-content"><span className="product-family">{selected.family}</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="modal-specs">{selected.features.map((feature) => <span key={feature}>✓ {feature}</span>)}</div><a className="primary-btn" href={specialistWaLink(selected.category, selected)} target="_blank" rel="noreferrer">اسأل المختص عن السعر والتوفر <span>←</span></a><small>سيرد عليك مختص القسم لتأكيد المواصفات والسعر الحالي.</small></div></div></div>}
    </main>
  );
}
