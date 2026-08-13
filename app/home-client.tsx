"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { normalizeMediaUrl } from "../lib/media-url";
import { isOpenInAden } from "./business-hours";
import { normalizeYemenPhone, yemenTelHref, yemenWhatsappHref } from "./contact-links";
import {
  resolvePrinterCategory,
  type PrinterCategory,
} from "./printer-categories";
import {
  buildQuickViewSpecificationRows,
  getProductCardSpecificationTags as getPrinterCardSpecificationTags,
  type PrinterSpecifications,
} from "./printer-specifications";
import {
  buildPaperSpecificationRows,
  getPaperAvailabilityLabel,
  getPaperCardSpecificationTags,
  type PaperSpecifications,
} from "./paper-specifications";
import { buildInkSpecificationRows, getInkCardSpecificationTags, type InkSpecifications } from "./ink-specifications";
import {
  defaultHeroSettings,
  defaultHeroSlides,
  defaultCategoryImages,
  defaultSiteSettings,
  type HeroSettings,
  type HeroSlide,
  type SiteSettings,
  type StoredProduct,
  normalizeProductBrandName,
  starterProducts as defaultStarterProducts,
} from "./site-defaults";
import { getPrinterSlug } from "./printers/product-slug";
import { getInkSlug } from "./inks/product-slug";
import { getPaperSlug } from "./papers/product-slug";
import InkImageCarousel from "./ink-image-carousel";
import QuickViewModal from "./quick-view-modal";
import { isPublicCategoryEnabled, PUBLIC_CATEGORY_DETAILS, PUBLIC_ENABLED_CATEGORIES } from "./public-categories";

const HERO_IMAGE_SIZES = "100vw";
const PRODUCT_CARD_IMAGE_SIZES = "(max-width: 430px) 145px, (max-width: 760px) 175px, (max-width: 1000px) 30vw, 280px";
const PRODUCT_MODAL_IMAGE_SIZES = "(max-width: 760px) calc(100vw - 56px), 420px";
const DEFAULT_IMAGE_SRC = "/brand/eshak-logo.png";
const FAVORITES_STORAGE_KEY = "eshak-favorite-products";
const allowedImagePrefixes = ["/api/media/", "/brand/", "/hero/", "/products/"];

type Product = {
  id: number;
  name: string;
  family: string;
  image: string;
  images?: string[];
  category: CategoryId;
  printerCategory?: PrinterCategory;
  type: string;
  size: string;
  badge?: string;
  price?: string;
  description: string;
  features: string[];
  specifications?: PrinterSpecifications;
  paperSpecifications?: PaperSpecifications;
  inkSpecifications?: InkSpecifications;
  specificationsSourceUrl?: string;
  specificationsVerifiedAt?: string;
};

type HomeClientProps = {
  initialSettings: SiteSettings;
  initialProducts: StoredProduct[];
  initialHeroSlides: HeroSlide[];
  initialHeroSettings: HeroSettings;
};

type MobileNavSection = "home" | "categories" | "search" | "contact";
type PageView = "home" | "categories";

function HomeProductSlider({ groups, label, groupSize }: { groups: ReactNode[][]; label: string; groupSize: number }) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [activeGroup, setActiveGroup] = useState(0);

  const updateActiveGroup = useCallback(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    const groupElements = Array.from(slider.querySelectorAll<HTMLElement>(":scope > .product-group"));
    if (!groupElements.length) return;
    const sliderStart = slider.getBoundingClientRect().right;
    const nearestIndex = groupElements.reduce((nearest, group, index) => {
      const currentDistance = Math.abs(sliderStart - group.getBoundingClientRect().right);
      const nearestDistance = Math.abs(sliderStart - groupElements[nearest].getBoundingClientRect().right);
      return currentDistance < nearestDistance ? index : nearest;
    }, 0);
    setActiveGroup(nearestIndex);
  }, []);

  const showGroup = (requestedIndex: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const nextIndex = Math.min(groups.length - 1, Math.max(0, requestedIndex));
    const target = slider.querySelectorAll<HTMLElement>(":scope > .product-group")[nextIndex];
    if (!target) return;
    const distanceFromStart = slider.getBoundingClientRect().right - target.getBoundingClientRect().right;
    slider.scrollTo({ left: slider.scrollLeft - distanceFromStart, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return <div className="home-product-slider">
    {groups.length > 1 && <div className="product-group-controls">
      <button type="button" disabled={activeGroup === 0} onClick={() => showGroup(activeGroup - 1)} aria-label={`المجموعة السابقة من ${label}`}>→</button>
      <button type="button" disabled={activeGroup === groups.length - 1} onClick={() => showGroup(activeGroup + 1)} aria-label={`المجموعة التالية من ${label}`}>←</button>
    </div>}
    <div ref={sliderRef} className={`home-category-products product-grid${groups.length > 1 ? " has-more" : ""}`} onScroll={updateActiveGroup} data-product-slider={label} data-product-group-size={groupSize} role="region" aria-label={`سلايدر ${label}`}>
      {groups.map((group, index) => <div className="product-group" key={`${label}-${index}`} inert={index !== activeGroup} aria-hidden={index !== activeGroup}>{group}</div>)}
    </div>
  </div>;
}

const mobileNavTargets: Record<MobileNavSection, string> = {
  home: "home",
  categories: "categories",
  search: "general-search",
  contact: "contact",
};

function MobileNavIcon({ section }: { section: MobileNavSection }) {
  if (section === "home") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5zM9 21v-7h6v7" /></svg>;
  if (section === "categories") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  if (section === "search") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>;
  if (section === "contact") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15.5a4 4 0 0 1-4 4H8l-5 2 1.6-4A7.8 7.8 0 0 1 3 12.8v-1.3a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7z" /><path d="M8 11.8h.01M12 11.8h.01M16 11.8h.01" /></svg>;
  return null;
}

type ServiceIconName = "consultation" | "setup" | "maintenance" | "delivery";

function ServiceIcon({ name }: { name: ServiceIconName }) {
  const paths: Record<ServiceIconName, ReactNode> = {
    consultation: <><path d="M7 9h10M7 13h6" /><path d="M5 19l-1 3 4-2h9a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v9a4 4 0 0 0 2 3Z" /></>,
    setup: <><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 8.6 7 6.3 4.7a4 4 0 0 0 5 5L20 18.4a2.1 2.1 0 0 1-3 3l-8.7-8.7a4 4 0 0 0-5 5L5.6 15 9 18.4l-2.3 2.3a4 4 0 0 0 5-5" /></>,
    maintenance: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    delivery: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" /><circle cx="7" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

const allCategories = [
  { id: "printers", name: PUBLIC_CATEGORY_DETAILS.printers.label, icon: "🖨️", description: PUBLIC_CATEGORY_DETAILS.printers.description },
  { id: "laptops", name: "اللابتوبات", icon: "💻", description: "أجهزة محمولة للعمل والدراسة والاستخدام اليومي" },
  { id: "engraving-presses", name: "آلات النحت والمكابس", icon: "⚙️", description: "حلول النحت والكبس للمشاريع والورش" },
  { id: "inks", name: PUBLIC_CATEGORY_DETAILS.inks.label, icon: "💧", description: PUBLIC_CATEGORY_DETAILS.inks.description },
  { id: "papers", name: PUBLIC_CATEGORY_DETAILS.papers.label, icon: "📄", description: PUBLIC_CATEGORY_DETAILS.papers.description },
  { id: "advertising-machines", name: "آلات الدعاية والإعلان", icon: "✦", description: "معدات الطباعة والقص والإنتاج الإعلاني" },
  { id: "electronics", name: "الملحقات الإلكترونية", icon: "🔌", description: "ملحقات إلكترونية عملية للأجهزة والمكاتب" },
  { id: "cameras", name: "الكاميرات", icon: "📷", description: "كاميرات ومعدات تصوير للاستخدامات المختلفة" },
  { id: "3d-printers", name: "طابعات ثلاثية الأبعاد", icon: "◈", description: "طابعات وخامات 3D للنماذج والمشاريع" },
  { id: "money-machines", name: "آلات عد وفحص النقود", icon: "💵", description: "أجهزة دقيقة للعد والكشف وفحص العملات" },
  { id: "networks", name: "الشبكات وأجهزة الواي فاي", icon: "◉", description: "راوترات ونقاط وصول وحلول ربط الشبكات" },
] as const;

const categories = allCategories.filter((category) => isPublicCategoryEnabled(category.id));

type CategoryId = typeof categories[number]["id"];

const homeCategoryOrder = PUBLIC_ENABLED_CATEGORIES;
const HOME_DESKTOP_GROUP_SIZE = 8;
const HOME_MOBILE_GROUP_SIZE = 6;
const HOME_MOBILE_SLIDER_QUERY = "(max-width: 760px)";

function subscribeToHomeSliderViewport(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(HOME_MOBILE_SLIDER_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
  };
}

function getHomeSliderViewportSnapshot() {
  return window.matchMedia(HOME_MOBILE_SLIDER_QUERY).matches;
}

function getHomeSliderServerSnapshot() {
  return false;
}

function useMobileHomeSlider() {
  return useSyncExternalStore(
    subscribeToHomeSliderViewport,
    getHomeSliderViewportSnapshot,
    getHomeSliderServerSnapshot,
  );
}

function chunkProducts<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));
}

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

function ProductImage({ src, alt, modal = false }: { src: string; alt: string; modal?: boolean }) {
  const [resolvedSrc, setResolvedSrc] = useState(() => imageSrcOrFallback(src));
  return <Image
    src={resolvedSrc}
    alt={alt}
    width={modal ? 700 : 560}
    height={modal ? 600 : 440}
    sizes={modal ? PRODUCT_MODAL_IMAGE_SIZES : PRODUCT_CARD_IMAGE_SIZES}
    loading={modal ? "eager" : "lazy"}
    placeholder="blur"
    blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='12'%3E%3Crect width='16' height='12' fill='%23eef4f6'/%3E%3C/svg%3E"
    onError={() => setResolvedSrc(DEFAULT_IMAGE_SRC)}
  />;
}

function normalizeInitialProduct(product: StoredProduct): Product {
  const category = isCategoryId(product.category) ? product.category : "printers";
  const inkImages = category === "inks"
    ? (product.images?.length ? product.images : product.inkSpecifications?.images?.length ? product.inkSpecifications.images : [product.image])
      .map((image) => safeImageSrc(image))
      .filter((image): image is string => Boolean(image))
    : undefined;
  const paperImages = category === "papers"
    ? (product.images?.length ? product.images : product.paperSpecifications?.images?.length ? product.paperSpecifications.images : [product.image])
      .map((image) => safeImageSrc(image))
      .filter((image): image is string => Boolean(image))
    : undefined;
  return {
    ...product,
    name: normalizeProductBrandName(product.name),
    family: category === "inks" ? "" : product.family,
    badge: product.badge,
    image: inkImages?.[0] ?? imageSrcOrFallback(product.image),
    images: inkImages ?? paperImages,
    category,
    printerCategory: category === "printers"
      ? resolvePrinterCategory(product.printerCategory, product.name)
      : undefined,
  };
}

function getProductCardSpecificationTags(product: Product) {
  return product.category === "inks"
    ? getInkCardSpecificationTags(product)
    : product.category === "papers"
    ? getPaperCardSpecificationTags(product)
    : getPrinterCardSpecificationTags(product);
}

function getProductDisplayName(product: Product) {
  return product.category === "papers"
    ? product.paperSpecifications?.nameEn?.trim() || product.name
    : product.name;
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

const starterProducts: Product[] = defaultStarterProducts.map(normalizeInitialProduct);

const whatsapp = "967777000725";
function generalWaLink(phone: string) {
  const text = "مرحبًا وكالة إسحاق العالمية، أريد المساعدة في اختيار المنتج المناسب.";
  return yemenWhatsappHref(phone, text, whatsapp);
}

function specialistWaLink(categoryId: CategoryId, product?: Product) {
  const category = categories.find((item) => item.id === categoryId) ?? categories[0];
  const text = product
    ? `مرحبًا وكالة إسحاق العالمية، أريد معرفة السعر والتوفر للمنتج: ${product.name} من قسم ${category.name}`
    : `مرحبًا وكالة إسحاق العالمية، أريد التواصل مع مختص في قسم ${category.name}`;
  return yemenWhatsappHref(categoryContacts[categoryId], text);
}

function maintenanceWaLink(phone: string) {
  const text = "مرحبًا، أريد التواصل مع قسم الصيانة في وكالة إسحاق العالمية.";
  return yemenWhatsappHref(phone, text);
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
      featureImage: safeImageSrc(nextSettings.featureImage) ?? "",
      categoryImages: Object.fromEntries(Object.entries({
        ...defaultCategoryImages,
        ...nextSettings.categoryImages,
      }).map(([key, value]) => [key, safeImageSrc(value) ?? ""])) as SiteSettings["categoryImages"],
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
    return nextProducts.length ? nextProducts : starterProducts.map((product) => ({
      ...product,
      name: normalizeProductBrandName(product.name),
    }));
  });
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("printers");
  const [pageView, setPageView] = useState<PageView>("home");
  const [selected, setSelected] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [mobileNavSection, setMobileNavSection] = useState<MobileNavSection>("home");
  const [scrollRequest, setScrollRequest] = useState<{ targetId: string; sequence: number } | null>(null);
  const [customerPhoneCopied, setCustomerPhoneCopied] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [outgoingHeroSlide, setOutgoingHeroSlide] = useState<number | null>(null);
  const [heroPaused, setHeroPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [quickViewTrigger, setQuickViewTrigger] = useState<HTMLElement | null>(null);
  const mobileHomeSlider = useMobileHomeSlider();
  const categoryStripRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const favoritesButtonRef = useRef<HTMLButtonElement | null>(null);
  const favoritesPanelRef = useRef<HTMLElement | null>(null);
  const favoritesCloseRef = useRef<HTMLButtonElement | null>(null);
  const heroTouchStartX = useRef<number | null>(null);
  const activeHeroSlideRef = useRef(0);
  const heroTransitionTimerRef = useRef<number | null>(null);
  const nextHeroPreloadRef = useRef<HTMLImageElement | null>(null);
  const scrollRequestSequenceRef = useRef(0);

  const customerPhone = normalizeYemenPhone(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const customerPhoneDisplay = customerPhone.replace(/^967/, "");
  const customerPhoneHref = yemenTelHref(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const salesPhoneHref = yemenTelHref(settings.salesPhone, defaultSiteSettings.salesPhone);
  const generalWhatsappPhone = normalizeYemenPhone(settings.generalWhatsapp, defaultSiteSettings.generalWhatsapp);
  const generalWhatsappDisplay = generalWhatsappPhone.replace(/^967/, "");
  const featureImageSrc = safeImageSrc(settings.featureImage);
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));
  const businessIsOpen = isOpenInAden(currentTime, settings);
  const normalizedQuery = query.trim().toLowerCase();
  const matchingProducts = normalizedQuery
    ? products.filter((product) => `${product.name} ${product.family} ${product.description}`.toLowerCase().includes(normalizedQuery))
    : products;
  const homeProductGroupSize = mobileHomeSlider ? HOME_MOBILE_GROUP_SIZE : HOME_DESKTOP_GROUP_SIZE;

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
    if (!heroSettings.autoplayEnabled || heroPaused || heroSlides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
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

  useEffect(() => {
    let storedFavorites: number[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(stored)) {
        const productIds = new Set(products.map((product) => product.id));
        storedFavorites = [...new Set(stored.map(Number).filter((id) => Number.isSafeInteger(id) && productIds.has(id)))];
      }
    } catch {
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
    }
    const hydrationTimer = window.setTimeout(() => {
      setFavorites(storedFavorites);
      setFavoritesReady(true);
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, [products]);

  useEffect(() => {
    if (favoritesReady) window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesReady]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (pageView === "categories") return undefined;
    const sectionIds: MobileNavSection[] = ["home", "search", "contact"];
    let frame = 0;
    const updateActiveSection = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const nextHeaderCompact = window.scrollY >= 96;
        setHeaderCompact((current) => current === nextHeaderCompact ? current : nextHeaderCompact);
        if (window.scrollY < 40) {
          setMobileNavSection("home");
          return;
        }
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
          setMobileNavSection("contact");
          return;
        }
        const headerHeight = document.querySelector<HTMLElement>(".header")?.getBoundingClientRect().height ?? 0;
        const marker = headerHeight + 24;
        const sections = sectionIds
          .map((id) => ({ id, element: document.getElementById(mobileNavTargets[id]) }))
          .filter((entry): entry is { id: MobileNavSection; element: HTMLElement } => Boolean(entry.element));
        const contactSection = sections.find(({ id }) => id === "contact");
        if (contactSection) {
          const contactRect = contactSection.element.getBoundingClientRect();
          if (contactRect.top <= window.innerHeight * 0.7 && contactRect.bottom > marker) {
            setMobileNavSection("contact");
            return;
          }
        }
        const reached = sections.filter(({ element }) => element.getBoundingClientRect().top <= marker);
        const active = reached[reached.length - 1] ?? sections[0];
        if (active) setMobileNavSection(active.id);
      });
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [pageView]);

  useEffect(() => {
    if (!scrollRequest) return undefined;
    let firstFrame = 0;
    let secondFrame = 0;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(scrollRequest.targetId);
        if (!target) return;
        const headerOffset = document.querySelector<HTMLElement>(".header")?.getBoundingClientRect().height ?? 0;
        const targetTop = scrollRequest.targetId === "home"
          ? 0
          : window.scrollY + target.getBoundingClientRect().top - headerOffset - 8;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        if (scrollRequest.targetId === "general-search") {
          target.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [scrollRequest]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", closeMenu);
    return () => document.removeEventListener("keydown", closeMenu);
  }, [menuOpen]);

  useEffect(() => {
    if (!favoritesOpen || selected) return undefined;
    const panel = favoritesPanelRef.current;
    const favoritesButton = favoritesButtonRef.current;
    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > :not(.favorites-backdrop)")];
    const backgroundState = backgroundElements.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => favoritesCloseRef.current?.focus());
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setFavoritesOpen(false); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.tabIndex >= 0);
      if (!focusable.length) { event.preventDefault(); favoritesCloseRef.current?.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleDialogKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKey);
      document.body.style.overflow = bodyOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.requestAnimationFrame(() => {
        if (!document.querySelector('[role="dialog"][aria-modal="true"]')) favoritesButton?.focus();
      });
    };
  }, [favoritesOpen, selected]);

  const currentCategory = categories.find((category) => category.id === activeCategory) ?? categories[0];

  const requestSectionScroll = (targetId: string) => {
    scrollRequestSequenceRef.current += 1;
    setScrollRequest({ targetId, sequence: scrollRequestSequenceRef.current });
  };

  const openCategory = (category: CategoryId) => {
    setPageView("home");
    setMobileNavSection("home");
    setActiveCategory(category);
    setQuery("");
    requestSectionScroll(`home-category-${category}`);
  };

  const openAllCategories = () => {
    setPageView("home");
    setMobileNavSection("home");
    setQuery("");
    requestSectionScroll("products");
  };

  const openHomeView = () => {
    setPageView("home");
    setMobileNavSection("home");
    setQuery("");
    setMenuOpen(false);
    requestSectionScroll("home");
  };

  const openHomeSection = (targetId: string) => {
    setPageView("home");
    setMenuOpen(false);
    requestSectionScroll(targetId);
  };

  const openMobileSection = (section: MobileNavSection) => {
    if (section === "home") {
      openHomeView();
      return;
    }
    setPageView("home");
    setMobileNavSection(section);
    requestSectionScroll(mobileNavTargets[section]);
  };

  const updateProductSearch = (value: string) => {
    setQuery(value);
    if (value) requestSectionScroll("products");
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
  const openQuickView = useCallback((product: Product, trigger: HTMLElement | null = null) => {
    setQuickViewTrigger(trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null));
    setSelected(product);
  }, []);
  const closeQuickView = useCallback(() => setSelected(null), []);
  const selectedSpecificationRows = selected
    ? selected.category === "inks"
      ? buildInkSpecificationRows(selected)
      : selected.category === "papers"
      ? buildPaperSpecificationRows(selected)
      : buildQuickViewSpecificationRows(selected)
    : [];

  const renderProductCard = (product: Product) => {
    const cardTags = getProductCardSpecificationTags(product);
    const availabilityLabel = product.category === "papers" ? getPaperAvailabilityLabel(product) : null;
    return <article className="product-card" data-category={product.category} data-product-id={product.id} key={product.id} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) openQuickView(product, event.currentTarget); }}>
      <div className="product-image">{product.badge?.trim() && <span className="product-badge">{product.badge}</span>}<button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorites.includes(product.id)}>♥</button>{product.category === "inks" ? <InkImageCarousel key={product.id} images={product.images?.length ? product.images : [product.image]} alt={getProductDisplayName(product)} variant="home-static" /> : product.category === "printers" ? <button type="button" className="product-image-trigger" onClick={(event) => openQuickView(product, event.currentTarget)} aria-label={`عرض التفاصيل السريعة لـ ${getProductDisplayName(product)}`}><ProductImage src={product.image} alt={getProductDisplayName(product)} /></button> : <ProductImage src={product.image} alt={getProductDisplayName(product)} />}</div>
      <div className="product-body">{product.family && <span className="product-family">{product.family}</span>}<h3>{getProductDisplayName(product)}</h3><button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)}>تفاصيل سريعة</button>{availabilityLabel && <span className="product-availability" data-availability>{availabilityLabel}</span>}{product.description && <p>{product.description}</p>}{cardTags.length > 0 && <div className="product-tags">{cardTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}<div className="product-footer"><div className="price"><small>السعر</small><strong>{product.price || "اطلب عرض سعر"}</strong></div><a href={specialistWaLink(product.category, product)} target="_blank" rel="noreferrer">اعرف السعر والتوفر</a></div></div>
    </article>;
  };

  return (
    <main id="main-content" tabIndex={-1} dir="rtl" className="home-page">
      <h1 className="seo-page-title">وكالة إسحاق العالمية للطابعات والأوراق والأحبار</h1>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>📍 {settings.address}</span>
          <div className="topbar-links"><span>توصيل إلى جميع المحافظات</span><span className="topbar-customer"><a dir="ltr" href={customerPhoneHref} aria-label={`الاتصال بخدمة العملاء على الرقم ${customerPhoneDisplay}`}>خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone} aria-label={`نسخ رقم خدمة العملاء ${customerPhoneDisplay}`}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ"}</button></span></div>
        </div>
      </div>

      <header className={headerCompact ? "header compact" : "header"}>
        <div className="container nav-wrap">
          <a href="#home" className="brand" aria-label="وكالة إسحاق العالمية" onClick={(event) => { event.preventDefault(); openHomeView(); }}><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={190} height={78} sizes="(max-width: 760px) 140px, 194px" /></a>
          <nav id="mobile-site-menu" className={menuOpen ? "nav-links open" : "nav-links"} aria-label="التنقل الرئيسي">
            <a href="#home" aria-current={pageView === "home" ? "page" : undefined} onClick={(event) => { event.preventDefault(); openHomeView(); }}>الرئيسية</a>
            <Link href="/categories" onClick={() => setMenuOpen(false)}>الفئات</Link>
            <a href="#maintenance" onClick={(event) => { event.preventDefault(); openHomeSection("maintenance"); }}>الصيانة</a>
            <a href="#services" onClick={(event) => { event.preventDefault(); openHomeSection("services"); }}>خدماتنا</a>
            <a href="#products" onClick={(event) => { event.preventDefault(); openCategory("printers"); }}>طابعات EPSON</a>
            <a href="#contact" onClick={(event) => { event.preventDefault(); openHomeSection("contact"); }}>تواصل معنا</a>
          </nav>
          <div className="nav-actions">
            <button ref={favoritesButtonRef} type="button" className="favorite-counter" onClick={() => setFavoritesOpen(true)} aria-label={`فتح المفضلة، ${favorites.length} منتجات`} aria-haspopup="dialog"><span>♡</span><b>{favorites.length}</b></button>
            <a className="nav-contact" href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">استشارات ومبيعات</a>
            <button ref={menuButtonRef} className="menu-btn" type="button" onClick={() => setMenuOpen((current) => !current)} aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-controls="mobile-site-menu" aria-expanded={menuOpen}><span></span><span></span><span></span></button>
          </div>
        </div>
      </header>

      {pageView === "home" && <>
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
        <div className="hero-slide-stage">
          {heroSlides.map((slide, index) => (
            <article key={slide.id} className={index === activeHeroSlide ? "hero-slide active" : "hero-slide"} aria-hidden={index !== activeHeroSlide}>
              {(index === activeHeroSlide || index === outgoingHeroSlide) && (
                <Image
                  src={imageSrcOrFallback(slide.imageUrl, defaultHeroSlides[0].imageUrl)}
                  alt={index === activeHeroSlide ? (slide.imageAlt || slide.title) : ""}
                  fill
                  sizes={HERO_IMAGE_SIZES}
                  className="hero-slide-image"
                  priority={index === 0}
                  fetchPriority={index === 0 ? "high" : "auto"}
                />
              )}
            </article>
          ))}
        </div>
        {heroSettings.showArrows && <><button className="hero-arrow hero-arrow-next" type="button" onClick={() => changeHeroSlide(1)} aria-label="الشريحة التالية">›</button>
        <button className="hero-arrow hero-arrow-prev" type="button" onClick={() => changeHeroSlide(-1)} aria-label="الشريحة السابقة">‹</button></>}
        {heroSettings.showDots && <div className="hero-dots" role="group" aria-label="اختيار الشريحة">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              className={index === activeHeroSlide ? "active" : ""}
              onClick={() => showHeroSlide(index)}
              aria-label={`عرض الشريحة ${index + 1}`}
              aria-pressed={index === activeHeroSlide}
            ></button>
          ))}
        </div>}
      </section>

      <section className="search-panel-wrap"><div className="container search-panel">
        <label className="search-field" id="general-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => updateProductSearch(event.target.value)} placeholder="ابحث في جميع المنتجات..." aria-label="البحث في المنتجات المعروضة" />{query && <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="مسح البحث">×</button>}</label>
        <div className="quick-points"><span>✓ أسعار منافسة</span><span>✓ منتجات موثوقة</span><span>✓ دعم فني متخصص</span></div>
      </div></section>

      <nav ref={categoryStripRef} className="category-strip home-category-strip" aria-label="أقسام المنتجات">
        <div className="container category-strip-list">
          <button type="button" className="active" onClick={openAllCategories} aria-current="page">جميع المنتجات</button>
          {homeCategoryOrder.map((categoryId) => {
            const category = categories.find((item) => item.id === categoryId);
            return category && <button key={category.id} type="button" onClick={() => openCategory(category.id)}>{category.name}</button>;
          })}
        </div>
      </nav>
      </>}

      {pageView === "home" && <>
      <section className="products-section" id="products"><div className="container">
        <div className="home-category-sections">{homeCategoryOrder.map((categoryId) => {
          const categoryProducts = matchingProducts.filter((product) => product.category === categoryId);
          if (normalizedQuery && categoryProducts.length === 0) return null;
          const productGroups = chunkProducts(categoryProducts, homeProductGroupSize).map((group) => group.map(renderProductCard));
          return <section className="home-category-section" id={`home-category-${categoryId}`} key={categoryId}><div className="home-category-heading"><div><span>منتجات القسم</span><h2>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h2></div><a href={PUBLIC_CATEGORY_DETAILS[categoryId].href}>الكل</a></div>{categoryProducts.length ? <HomeProductSlider key={`${categoryId}-${homeProductGroupSize}`} groups={productGroups} groupSize={homeProductGroupSize} label={PUBLIC_CATEGORY_DETAILS[categoryId].label} /> : <p className="home-category-empty">لا توجد منتجات في هذا القسم حاليًا.</p>}</section>;
        })}</div>{normalizedQuery && matchingProducts.length === 0 && <div className="search-empty" role="status"><b>لا توجد منتجات مطابقة لبحثك</b><p>جرّب كتابة اسم أو تصنيف آخر.</p><button type="button" onClick={() => setQuery("")}>مسح البحث</button></div>}
      </div></section>

      <section className="feature-band" id="about"><div className="container feature-band-inner">
        <div className="feature-image"><div className="cyan-disc"></div>{featureImageSrc && <Image src={featureImageSrc} alt="صورة البانر الدعائي" width={640} height={640} sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 540px" loading="lazy" />}</div>
        <div className="feature-copy"><span className="eyebrow dark">{settings.featureEyebrow}</span><h2>{settings.featureTitle}</h2><p>{settings.featureDescription}</p><ul><li><b>اختيار دقيق</b><span>ترشيح الموديل حسب احتياجك الفعلي.</span></li><li><b>توريد وتجهيز</b><span>تجهيز الطابعة وربطها ببيئة العمل.</span></li><li><b>دعم مستمر</b><span>مساندة فنية ومستلزمات تشغيل أصلية.</span></li></ul><a className="primary-btn" href={specialistWaLink("printers")} target="_blank" rel="noreferrer">تواصل مع مختص الطابعات <span>←</span></a></div>
      </div></section>

      <section className="services" id="services"><div className="container">
        <div className="center-heading"><span className="section-kicker">لماذا وكالة إسحاق؟</span><h2>خدمة متكاملة لقطاع الأعمال</h2></div>
        <div className="services-grid"><article><span>01</span><div className="service-icon"><ServiceIcon name="consultation" /></div><h3>استشارات قبل الشراء</h3><p>نقارن لك الخيارات ونحدد الأنسب حسب طبيعة عملك وميزانيتك.</p></article><article><span>02</span><div className="service-icon"><ServiceIcon name="setup" /></div><h3>تجهيز وتركيب</h3><p>تهيئة الجهاز ومساعدتك على بدء الاستخدام بصورة صحيحة.</p></article><article><span>03</span><div className="service-icon"><ServiceIcon name="maintenance" /></div><h3>صيانة ودعم فني</h3><p>فريق متخصص لمتابعة الأعطال والصيانة الدورية والمستلزمات.</p></article><article><span>04</span><div className="service-icon"><ServiceIcon name="delivery" /></div><h3>توصيل آمن وسريع</h3><p>تغليف وتجهيز مناسب مع توصيل داخل صنعاء وإلى المحافظات.</p></article></div>
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
                <a className="maintenance-call" href={yemenTelHref(contact.phone)} aria-label={`اتصال هاتفي بـ ${contact.label} على الرقم ${contact.display}`}>اتصال هاتفي</a>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section className="contact-banner" id="contact"><div className="container contact-banner-inner"><div><span>{settings.contactKicker}</span><h2>{settings.contactTitle}</h2><p className="contact-address">📍 {settings.address}</p></div><div className="contact-actions"><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">استشارات ومبيعات: {generalWhatsappDisplay}</a><a href={customerPhoneHref} className="outline" dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم نسخ الرقم ✓" : "نسخ الرقم"}</button></div></div></section>

      <footer><div className="container footer-grid">
        <div className="footer-brand"><Image src={imageSrcOrFallback(settings.logoImage)} alt="وكالة إسحاق العالمية" width={210} height={90} sizes="190px" loading="lazy" /><p>حلول تقنية وتجارية وتجهيزات موثوقة للأفراد والشركات والمؤسسات في اليمن.</p></div>
        <div><h3>روابط سريعة</h3><a href="#home" onClick={(event) => { event.preventDefault(); openHomeView(); }}>الرئيسية</a><Link href="/categories">الفئات</Link><a href="#maintenance">الصيانة</a><a href="#products">طابعات EPSON</a><a href="#services">خدماتنا</a></div>
        <div><h3>تواصل معنا</h3><a href={customerPhoneHref} dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button className="footer-copy-phone" type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ الرقم"}</button><a href={salesPhoneHref}>هاتف المبيعات: {settings.salesPhone}</a><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">استشارات ومبيعات: {generalWhatsappDisplay}</a><p>{settings.address}</p></div>
        <div><h3>أوقات العمل</h3><p>{settings.workDays}</p><p>{settings.workHours}</p><span className={businessIsOpen ? "open-label" : "open-label closed"}>{businessIsOpen ? "● متاحون الآن" : "● مغلق الآن"}</span></div>
      </div><div className="container copyright"><span>© 2026 وكالة إسحاق العالمية. جميع الحقوق محفوظة.</span><span>EPSON وWorkForce علامتان تجاريتان مملوكتان لأصحابهما.</span></div></footer>
      </>}

      {pageView === "home" && <a className="whatsapp-float" href={specialistWaLink(activeCategory)} target="_blank" rel="noreferrer" aria-label={`تواصل مع مختص قسم ${currentCategory.name}`}>مختص القسم <span>◉</span></a>}
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        {([
          ["home", "الرئيسية"],
          ["categories", "الفئات"],
          ["search", "البحث"],
          ["contact", "تواصل معنا"],
        ] as const).map(([section, label]) => section === "categories" ? <Link key={section} href="/categories"><MobileNavIcon section={section} /><span>{label}</span></Link> : <button
          key={section}
          type="button"
          className={mobileNavSection === section ? "active" : ""}
          aria-current={mobileNavSection === section ? "page" : undefined}
          onClick={() => openMobileSection(section)}
        ><MobileNavIcon section={section} /><span>{label}</span></button>)}
      </nav>
      {favoritesOpen && <div className="modal-backdrop favorites-backdrop" onMouseDown={() => setFavoritesOpen(false)}><aside ref={favoritesPanelRef} className="favorites-panel" role="dialog" aria-modal="true" aria-labelledby="favorites-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="favorites-header"><div><span>قائمتك المحفوظة</span><h2 id="favorites-title">المفضلة ({favorites.length})</h2></div><button ref={favoritesCloseRef} type="button" onClick={() => setFavoritesOpen(false)} aria-label="إغلاق المفضلة">×</button></div>
        {favoriteProducts.length ? <div className="favorites-list">{favoriteProducts.map((product) => <article key={product.id}><Image src={imageSrcOrFallback(product.image)} alt={getProductDisplayName(product)} width={110} height={90} sizes="76px" /><div><b>{getProductDisplayName(product)}</b><span>{product.family}</span><div className="favorite-actions"><button type="button" onClick={(event) => { setFavoritesOpen(false); openQuickView(product, event.currentTarget); }}>عرض المنتج</button><button type="button" className="remove-favorite" onClick={() => toggleFavorite(product.id)}>إزالة</button></div></div></article>)}</div> : <p className="favorites-empty">لم تقم بإضافة أي منتجات إلى المفضلة بعد</p>}
        {favoriteProducts.length > 0 && <button type="button" className="clear-favorites" onClick={() => setFavorites([])}>مسح المفضلة</button>}
      </aside></div>}
      {selected && <QuickViewModal id={selected.id} title={getProductDisplayName(selected)} categoryLabel={categories.find((category) => category.id === selected.category)?.name ?? selected.family} family={selected.family} badge={selected.badge} availabilityLabel={selected.category === "papers" ? getPaperAvailabilityLabel(selected) : null} description={selected.description} price={selected.price} images={selected.images?.length ? selected.images : [selected.image]} rows={selectedSpecificationRows} detailsHref={selected.category === "printers" ? `/printers/${getPrinterSlug(selected)}` : selected.category === "inks" ? `/inks/${getInkSlug(selected)}` : `/papers/${getPaperSlug(selected)}`} whatsappHref={specialistWaLink(selected.category, selected)} whatsappLabel="اعرف السعر والتوفر" footerNote="سيرد عليك مختص القسم لتأكيد المواصفات والسعر الحالي." trigger={quickViewTrigger} onClose={closeQuickView} />}
    </main>
  );
}
