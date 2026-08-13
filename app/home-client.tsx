"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { normalizeMediaUrl } from "../lib/media-url";
import { isOpenInAden } from "./business-hours";
import { normalizeYemenPhone, yemenTelHref, yemenWhatsappHref } from "./contact-links";
import {
  resolvePrinterCategory,
  type PrinterCategory,
} from "./printer-categories";
import {
  buildQuickViewSpecificationRows,
  type PrinterSpecifications,
} from "./printer-specifications";
import {
  buildPaperSpecificationRows,
  getPaperAvailabilityLabel,
  type PaperSpecifications,
} from "./paper-specifications";
import { buildInkSpecificationRows, type InkSpecifications } from "./ink-specifications";
import { productPriceLabel } from "./product-commerce";
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
import { isPublicCategoryEnabled, PUBLIC_CATEGORY_DETAILS, type PublicEnabledCategory } from "./public-categories";

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
type DrawerIconName = "home" | "grid" | "heart" | "search" | "headset" | "phone" | "link" | "printer" | "ink" | "paper" | "whatsapp";

function DrawerIcon({ name }: { name: DrawerIconName }) {
  const paths: Record<DrawerIconName, ReactNode> = {
    home: <><path d="M3 10.8 12 3l9 7.8"/><path d="M5.5 9.8V21h13V9.8M9.5 21v-6h5v6"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    heart: <path d="M20.8 4.7a5.3 5.3 0 0 0-7.5 0L12 6l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.8a5.3 5.3 0 0 0 0-7.5Z"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    headset: <><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Zm16 0h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z"/><path d="M17 20c-1 1-2.7 1.5-5 1.5"/></>,
    phone: <path d="M7.2 3.5 10 8 7.9 10a14.4 14.4 0 0 0 6.1 6.1l2-2.1 4.5 2.8-.6 3a2 2 0 0 1-2 1.7C9.4 21.5 2.5 14.6 2.5 6a2 2 0 0 1 1.7-2l3-.5Z"/>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></>,
    printer: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/><path d="M18 12h.01"/></>,
    ink: <><path d="M9 3h6v4H9zM8 7h8l2 4v10H6V11l2-4Z"/><path d="M9 14h6"/></>,
    paper: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
    whatsapp: <><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.2 7.8c.4-.4.8-.2 1 .2l.9 2c.1.3 0 .6-.3.9l-.7.6c.7 1.5 1.8 2.6 3.4 3.4l.6-.8c.2-.3.6-.4.9-.2l1.9.9c.4.2.6.6.3 1-.5.8-1.4 1.3-2.3 1.2-3.8-.5-7-3.5-7.5-7.4-.1-.8.8-1.4 1.8-1.8Z"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

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

const homeCategoryOrder: PublicEnabledCategory[] = ["printers", "inks", "papers"];
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

function getProductDisplayName(product: Product) {
  return product.category === "papers"
    ? product.paperSpecifications?.nameEn?.trim() || product.name
    : product.name;
}

function getProductDetailsHref(product: Product) {
  if (product.category === "inks") return `/inks/${getInkSlug(product)}`;
  if (product.category === "papers") return `/papers/${getPaperSlug(product)}`;
  return `/printers/${getPrinterSlug(product)}`;
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
  const [activeHeaderDrawer, setActiveHeaderDrawer] = useState<"closed" | "menu" | "wishlist">("closed");
  const menuOpen = activeHeaderDrawer === "menu";
  const favoritesOpen = activeHeaderDrawer === "wishlist";
  const [importantLinksOpen, setImportantLinksOpen] = useState(false);
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
  const menuDrawerRef = useRef<HTMLElement | null>(null);
  const menuCloseRef = useRef<HTMLButtonElement | null>(null);
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
    const url = new URL(window.location.href);
    if (url.searchParams.get("favorites") !== "1") return;
    url.searchParams.delete("favorites");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    const timer = window.setTimeout(() => setActiveHeaderDrawer("wishlist"), 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  useLayoutEffect(() => {
    if (!menuOpen) return undefined;
    const drawer = menuDrawerRef.current ?? document.getElementById("site-menu-drawer");
    const menuButton = menuButtonRef.current;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => drawer?.querySelector<HTMLElement>(".drawer-close")?.focus(), 0);
    const handleMenuKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveHeaderDrawer("closed");
        return;
      }
      if (event.key !== "Tab" || !drawer) return;
      const focusable = [...drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.tabIndex >= 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !drawer.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !drawer.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleMenuKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleMenuKey);
      document.body.style.overflow = bodyOverflow;
      window.requestAnimationFrame(() => {
        if (!document.querySelector(".menu-overlay.open")) menuButton?.focus();
      });
    };
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!favoritesOpen || selected) return undefined;
    const panel = favoritesPanelRef.current;
    const favoritesButton = favoritesButtonRef.current;
    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > :not(.menu-overlay)")];
    const backgroundState = backgroundElements.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    favoritesCloseRef.current?.focus();
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setActiveHeaderDrawer("closed"); return; }
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
    setActiveHeaderDrawer("closed");
    requestSectionScroll("home");
  };

  const openHomeSection = (targetId: string) => {
    setPageView("home");
    setActiveHeaderDrawer("closed");
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

  const openSiteMenu = () => {
    setActiveHeaderDrawer("menu");
    window.setTimeout(() => document.querySelector<HTMLElement>("#site-menu-drawer .drawer-close")?.focus(), 150);
  };

  const openWishlist = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setActiveHeaderDrawer("wishlist");
    window.setTimeout(() => document.querySelector<HTMLElement>("#wishlist-drawer .drawer-close")?.focus(), 150);
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
    const availabilityLabel = product.category === "papers" ? getPaperAvailabilityLabel(product) : null;
    const detailsHref = getProductDetailsHref(product);
    return <article className="product-card" data-category={product.category} data-product-id={product.id} key={product.id} onClick={(event) => { if (!(event.target as HTMLElement).closest("button,a")) openQuickView(product, event.currentTarget); }}>
      <div className="product-image">{product.badge?.trim() && <span className="product-badge">{product.badge}</span>}<button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorites.includes(product.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg></button><Link className="product-image-link" href={detailsHref} aria-label={`عرض صفحة ${getProductDisplayName(product)}`}>{product.category === "inks" ? <InkImageCarousel key={product.id} images={product.images?.length ? product.images : [product.image]} alt={getProductDisplayName(product)} variant="home-static" /> : <ProductImage src={product.image} alt={getProductDisplayName(product)} />}</Link><button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)} aria-label={`تفاصيل سريعة لـ ${getProductDisplayName(product)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg><span>تفاصيل سريعة</span></button></div>
      <div className="product-body">{product.family && <span className="product-family">{product.family}</span>}<h3><Link href={detailsHref}>{getProductDisplayName(product)}</Link></h3>{availabilityLabel && <span className="product-availability" data-availability>{availabilityLabel}</span>}<div className="product-footer"><div className="price"><small>السعر</small><strong>{productPriceLabel(product.price)}</strong></div><a href={specialistWaLink(product.category, product)} target="_blank" rel="noreferrer">اعرف السعر والتوفر</a></div></div>
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
          <button ref={menuButtonRef} className="menu-btn" type="button" onClick={openSiteMenu} aria-label="فتح القائمة" aria-controls="site-menu-drawer" aria-expanded={menuOpen}><span></span><span></span><span></span></button>
          <a href="#home" className="brand" aria-label="وكالة إسحاق العالمية" onClick={(event) => { event.preventDefault(); openHomeView(); }}><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={190} height={78} sizes="(max-width: 760px) 140px, 194px" /></a>
          <button ref={favoritesButtonRef} type="button" className="favorite-counter" onClick={openWishlist} aria-label={favorites.length ? `فتح قائمة الرغبات، ${favorites.length} منتجات` : "فتح قائمة الرغبات"} aria-controls="wishlist-drawer" aria-expanded={favoritesOpen} aria-haspopup="dialog"><DrawerIcon name="heart"/>{favorites.length > 0 && <b>{favorites.length}</b>}</button>
        </div>
      </header>

      <div className={activeHeaderDrawer === "closed" ? "menu-overlay" : `menu-overlay open ${activeHeaderDrawer}-open`} aria-hidden={activeHeaderDrawer === "closed"} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveHeaderDrawer("closed"); }}>
        <aside ref={menuDrawerRef} id="site-menu-drawer" className="site-menu-drawer" role="dialog" aria-modal={menuOpen ? "true" : undefined} aria-hidden={!menuOpen} inert={!menuOpen} aria-labelledby="site-menu-title">
          <div className="drawer-header">
            <button ref={menuCloseRef} type="button" className="drawer-close" autoFocus={menuOpen} onClick={() => setActiveHeaderDrawer("closed")} aria-label="إغلاق القائمة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            <a href="#home" className="drawer-brand" onClick={(event) => { event.preventDefault(); openHomeView(); }} aria-label="وكالة إسحاق العالمية"><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={176} height={72} sizes="176px" /></a>
          </div>
          <h2 id="site-menu-title" className="drawer-title">القائمة الرئيسية</h2>
          <nav className="drawer-nav" aria-label="قائمة الموقع">
            <a href="#home" onClick={(event) => { event.preventDefault(); openHomeView(); }}><DrawerIcon name="home"/><span>الرئيسية</span></a>
            <Link href="/categories" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="grid"/><span>جميع المنتجات</span></Link>
            <button type="button" onClick={openWishlist}><DrawerIcon name="heart"/><span>قائمة الرغبات</span>{favorites.length > 0 && <b>{favorites.length}</b>}</button>
            <a href="#general-search" onClick={(event) => { event.preventDefault(); openHomeSection("general-search"); }}><DrawerIcon name="search"/><span>البحث</span></a>
            <a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="headset"/><span>استشارات ومبيعات</span></a>
            <a href="#contact" onClick={(event) => { event.preventDefault(); openHomeSection("contact"); }}><DrawerIcon name="phone"/><span>تواصل معنا</span></a>
            <button type="button" className="drawer-accordion-trigger" onClick={() => setImportantLinksOpen((current) => !current)} aria-expanded={importantLinksOpen} aria-controls="drawer-important-links"><DrawerIcon name="link"/><span>روابط مهمة</span><svg className="drawer-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg></button>
          </nav>
          <div id="drawer-important-links" className={importantLinksOpen ? "drawer-important-links open" : "drawer-important-links"} hidden={!importantLinksOpen}>
            <Link href="/printers" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="printer"/><span>الطابعات</span></Link>
            <Link href="/inks" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="ink"/><span>الأحبار</span></Link>
            <Link href="/papers" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="paper"/><span>الأوراق</span></Link>
            <Link href="/categories" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="grid"/><span>الفئات</span></Link>
          </div>
          <div className="drawer-contact-area">
            <a href={customerPhoneHref}><DrawerIcon name="phone"/><span><small>خدمة العملاء</small><b dir="ltr">{customerPhoneDisplay}</b></span></a>
            <a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer"><DrawerIcon name="whatsapp"/><span><small>استشارات ومبيعات</small><b dir="ltr">{generalWhatsappDisplay}</b></span></a>
          </div>
        </aside>
        <aside ref={favoritesPanelRef} id="wishlist-drawer" className="favorites-panel wishlist-drawer" role="dialog" aria-modal={favoritesOpen ? "true" : undefined} aria-hidden={!favoritesOpen} inert={!favoritesOpen} aria-labelledby="favorites-title">
          <div className="favorites-header"><div><h2 id="favorites-title">قائمة الرغبات</h2><span>{favorites.length} منتجات</span></div><button ref={favoritesCloseRef} type="button" className="drawer-close" autoFocus={favoritesOpen} onClick={() => setActiveHeaderDrawer("closed")} aria-label="إغلاق قائمة الرغبات"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
          {favoriteProducts.length ? <div className="favorites-list">{favoriteProducts.map((product) => <article key={product.id}><Image src={imageSrcOrFallback(product.image)} alt={getProductDisplayName(product)} width={110} height={90} sizes="76px" /><div><b>{getProductDisplayName(product)}</b><span>{product.family}</span><div className="favorite-actions"><Link href={getProductDetailsHref(product)} onClick={() => setActiveHeaderDrawer("closed")}>فتح المنتج</Link><button type="button" className="remove-favorite" onClick={() => toggleFavorite(product.id)}>إزالة</button></div></div></article>)}</div> : <div className="favorites-empty"><DrawerIcon name="heart"/><h3>لا توجد منتجات في قائمة الرغبات</h3><p>أضف المنتجات التي تهمك للرجوع إليها لاحقًا.</p><Link href="/categories" onClick={() => setActiveHeaderDrawer("closed")}>تسوق الآن</Link></div>}
          {favoriteProducts.length > 0 && <button type="button" className="clear-favorites" onClick={() => setFavorites([])}>مسح قائمة الرغبات</button>}
        </aside>
      </div>

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
              {index === activeHeroSlide && slide.primaryButtonText.trim() && slide.primaryButtonUrl.trim() && (
                <Link className="hero-slide-cta" href={slide.primaryButtonUrl}>{slide.primaryButtonText}</Link>
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

      <section className="storefront-categories" id="categories" aria-labelledby="storefront-categories-title"><div className="container">
        <div className="storefront-section-heading"><div><h2 id="storefront-categories-title">تسوق حسب الفئة</h2><p>ابدأ من القسم الأقرب لاحتياجك</p></div><Link href="/categories">عرض جميع الفئات <span aria-hidden="true">←</span></Link></div>
        <div className="storefront-category-grid">{homeCategoryOrder.map((categoryId) => {
          const categoryProducts = products.filter((product) => product.category === categoryId);
          const categoryImage = settings.categoryImages[categoryId] || categoryProducts[0]?.image || settings.logoImage;
          return <Link className="storefront-category-card" data-category={categoryId} href={PUBLIC_CATEGORY_DETAILS[categoryId].href} key={categoryId}><div className="storefront-category-image"><Image src={imageSrcOrFallback(categoryImage)} alt={PUBLIC_CATEGORY_DETAILS[categoryId].label} width={720} height={520} sizes="(max-width: 760px) calc(100vw - 44px), (max-width: 1100px) 31vw, 380px" /></div><div><span>{categoryProducts.length ? `${categoryProducts.length} منتجات` : "تصفح القسم"}</span><h3>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h3><b>تسوق الآن <i aria-hidden="true">←</i></b></div></Link>;
        })}</div>
      </div></section>

      </>}

      {pageView === "home" && <>
      <section className="products-section" id="products"><div className="container">
        <div className="home-category-sections">{homeCategoryOrder.map((categoryId) => {
          const categoryProducts = matchingProducts.filter((product) => product.category === categoryId);
          if (normalizedQuery && categoryProducts.length === 0) return null;
          const productGroups = chunkProducts(categoryProducts, homeProductGroupSize).map((group) => group.map(renderProductCard));
          return <section className="home-category-section" id={`home-category-${categoryId}`} key={categoryId}><div className="home-category-heading"><div><span>اكتشف منتجاتنا</span><h2>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h2></div><a href={PUBLIC_CATEGORY_DETAILS[categoryId].href}>عرض الكل <span aria-hidden="true">←</span></a></div>{categoryProducts.length ? <HomeProductSlider key={`${categoryId}-${homeProductGroupSize}`} groups={productGroups} groupSize={homeProductGroupSize} label={PUBLIC_CATEGORY_DETAILS[categoryId].label} /> : <p className="home-category-empty">لا توجد منتجات في هذا القسم حاليًا.</p>}</section>;
        })}</div>{normalizedQuery && matchingProducts.length === 0 && <div className="search-empty" role="status"><b>لا توجد منتجات مطابقة لبحثك</b><p>جرّب كتابة اسم أو تصنيف آخر.</p><button type="button" onClick={() => setQuery("")}>مسح البحث</button></div>}
      </div></section>

      <section className="search-panel-wrap"><div className="container search-panel">
        <label className="search-field" id="general-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => updateProductSearch(event.target.value)} placeholder="ابحث في جميع المنتجات..." aria-label="البحث في المنتجات المعروضة" />{query && <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="مسح البحث">×</button>}</label>
        <div className="quick-points"><span>✓ أسعار منافسة</span><span>✓ منتجات موثوقة</span><span>✓ دعم فني متخصص</span></div>
      </div></section>

      <nav ref={categoryStripRef} className="category-strip home-category-strip storefront-quick-categories" aria-label="أقسام المنتجات">
        <div className="container category-strip-list">
          <button type="button" className="active" onClick={openAllCategories} aria-current="page">جميع المنتجات</button>
          {homeCategoryOrder.map((categoryId) => {
            const category = categories.find((item) => item.id === categoryId);
            return category && <button key={category.id} type="button" onClick={() => openCategory(category.id)}>{category.name}</button>;
          })}
        </div>
      </nav>

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

      <footer><div className="container footer-grid storefront-footer-grid">
        <div className="footer-brand"><Image src={imageSrcOrFallback(settings.logoImage)} alt="وكالة إسحاق العالمية" width={210} height={90} sizes="190px" loading="lazy" /><p>حلول تقنية وتجارية وتجهيزات موثوقة للأفراد والشركات والمؤسسات في اليمن.</p></div>
        <div><h3>الفئات</h3><Link href="/printers">الطابعات</Link><Link href="/inks">الأحبار</Link><Link href="/papers">الأوراق</Link><Link href="/categories">جميع الفئات</Link></div>
        <div><h3>روابط مهمة</h3><a href="#home" onClick={(event) => { event.preventDefault(); openHomeView(); }}>الرئيسية</a><a href="#services">خدماتنا</a><a href="#maintenance">الصيانة</a><a href="#contact">تواصل معنا</a></div>
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
      {selected && <QuickViewModal id={selected.id} title={getProductDisplayName(selected)} categoryLabel={categories.find((category) => category.id === selected.category)?.name ?? selected.family} family={selected.family} badge={selected.badge} availabilityLabel={selected.category === "papers" ? getPaperAvailabilityLabel(selected) : null} description={selected.description} price={selected.price} images={selected.images?.length ? selected.images : [selected.image]} rows={selectedSpecificationRows} detailsHref={selected.category === "printers" ? `/printers/${getPrinterSlug(selected)}` : selected.category === "inks" ? `/inks/${getInkSlug(selected)}` : `/papers/${getPaperSlug(selected)}`} whatsappHref={specialistWaLink(selected.category, selected)} whatsappLabel="اعرف السعر والتوفر" footerNote="سيرد عليك مختص القسم لتأكيد المواصفات والسعر الحالي." trigger={quickViewTrigger} onClose={closeQuickView} />}
    </main>
  );
}
