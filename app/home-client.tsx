"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { normalizeMediaUrl } from "../lib/media-url";
import { normalizeYemenPhone, yemenTelHref, yemenWhatsappHref } from "./contact-links";
import {
  HOME_PRINTER_LABELS,
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
import { searchProducts, type ProductSearchScope } from "./global-product-search";
import { maintenanceContacts, maintenanceServices, maintenanceWhatsappHref } from "./maintenance-data";
import StorefrontFooter from "./storefront-footer";

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
  initialPage?: "home" | "maintenance";
};

type MobileNavSection = "home" | "categories" | "search" | "contact";
type PageView = "home" | "categories" | "maintenance";
type DrawerIconName = "home" | "grid" | "heart" | "search" | "headset" | "phone" | "link" | "printer" | "ink" | "paper" | "whatsapp" | "maintenance";

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
    maintenance: <><path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 8.6 7 6.3 4.7a4 4 0 0 0 5 5L20 18.4a2.1 2.1 0 0 1-3 3l-8.7-8.7"/><path d="m5 15-2 2 4 4 2-2"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

const PRODUCT_DRAG_THRESHOLD = 7;

function HomeProductSlider({ products, label }: { products: ReactNode[]; label: string }) {
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({ pointerId: -1, startX: 0, startScrollLeft: 0, dragged: false });
  const [dragging, setDragging] = useState(false);

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current.pointerId = -1;
    setDragging(false);
    if (dragState.current.dragged) window.setTimeout(() => { dragState.current.dragged = false; }, 0);
  };

  return <div
    ref={sliderRef}
    className={dragging ? "home-category-products is-dragging" : "home-category-products"}
    data-product-slider={label}
    role="region"
    tabIndex={0}
    aria-label={`منتجات ${label}، مرر أفقيًا لعرض المزيد`}
    onPointerDown={(event) => {
      if ((event.pointerType !== "mouse" && event.pointerType !== "pen") || event.button !== 0) return;
      if ((event.target as HTMLElement).closest("button")) return;
      dragState.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: event.currentTarget.scrollLeft, dragged: false };
    }}
    onPointerMove={(event) => {
      if (dragState.current.pointerId !== event.pointerId) return;
      const distance = event.clientX - dragState.current.startX;
      if (!dragState.current.dragged) {
        if (Math.abs(distance) < PRODUCT_DRAG_THRESHOLD) return;
        dragState.current.dragged = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }
      event.preventDefault();
      event.currentTarget.scrollLeft = dragState.current.startScrollLeft - distance;
    }}
    onPointerUp={finishDrag}
    onPointerCancel={finishDrag}
    onClickCapture={(event) => {
      if (!dragState.current.dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragState.current.dragged = false;
    }}
    onDragStart={(event) => event.preventDefault()}
  >{products}</div>;
}

const mobileNavTargets: Record<MobileNavSection, string> = {
  home: "home",
  categories: "categories",
  search: "home",
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
    draggable={false}
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

function getHomeProductCategoryLine(product: Product) {
  if (product.category === "printers" && product.printerCategory) {
    return HOME_PRINTER_LABELS[product.printerCategory] ?? product.type;
  }
  if (product.category === "inks") return product.inkSpecifications?.inkType?.trim() || product.type;
  if (product.category === "papers") return product.paperSpecifications?.paperType?.trim() || product.type;
  return product.type;
}

function getHomeProductBrandLine(product: Product) {
  if (product.category === "inks") return product.inkSpecifications?.brand?.trim() || product.family;
  if (product.category === "papers") return product.paperSpecifications?.brand?.trim() || product.family;
  return product.family;
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

export default function HomeClient({
  initialSettings,
  initialProducts,
  initialHeroSlides,
  initialHeroSettings,
  initialPage = "home",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<ProductSearchScope>("all");
  const [activeCategory, setActiveCategory] = useState<CategoryId>("printers");
  const [pageView, setPageView] = useState<PageView>(initialPage);
  const [selected, setSelected] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [activeHeaderDrawer, setActiveHeaderDrawer] = useState<"closed" | "menu" | "wishlist" | "search">("closed");
  const menuOpen = activeHeaderDrawer === "menu";
  const favoritesOpen = activeHeaderDrawer === "wishlist";
  const searchOpen = activeHeaderDrawer === "search";
  const [importantLinksOpen, setImportantLinksOpen] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [mobileNavSection, setMobileNavSection] = useState<MobileNavSection>("home");
  const [scrollRequest, setScrollRequest] = useState<{ targetId: string; sequence: number } | null>(null);
  const [customerPhoneCopied, setCustomerPhoneCopied] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [outgoingHeroSlide, setOutgoingHeroSlide] = useState<number | null>(null);
  const [heroPaused, setHeroPaused] = useState(false);
  const [quickViewTrigger, setQuickViewTrigger] = useState<HTMLElement | null>(null);
  const categoryStripRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuDrawerRef = useRef<HTMLElement | null>(null);
  const menuCloseRef = useRef<HTMLButtonElement | null>(null);
  const favoritesButtonRef = useRef<HTMLButtonElement | null>(null);
  const favoritesPanelRef = useRef<HTMLElement | null>(null);
  const favoritesCloseRef = useRef<HTMLButtonElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchPanelRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const heroTouchStartX = useRef<number | null>(null);
  const activeHeroSlideRef = useRef(0);
  const heroTransitionTimerRef = useRef<number | null>(null);
  const nextHeroPreloadRef = useRef<HTMLImageElement | null>(null);
  const scrollRequestSequenceRef = useRef(0);

  const customerPhone = normalizeYemenPhone(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const customerPhoneDisplay = customerPhone.replace(/^967/, "");
  const customerPhoneHref = yemenTelHref(settings.customerServicePhone, defaultSiteSettings.customerServicePhone);
  const generalWhatsappPhone = normalizeYemenPhone(settings.generalWhatsapp, defaultSiteSettings.generalWhatsapp);
  const generalWhatsappDisplay = generalWhatsappPhone.replace(/^967/, "");
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));
  const normalizedSearchQuery = searchQuery.trim();
  const matchingSearchProducts = useMemo(() => searchProducts(
    products,
    searchQuery,
    searchScope,
    (product) => [
      product.name,
      getProductDisplayName(product),
      product.family,
      product.type,
      product.description,
      getHomeProductBrandLine(product),
      getHomeProductCategoryLine(product),
      product.printerCategory,
      product.inkSpecifications?.inkType,
      product.paperSpecifications?.paperType,
    ],
  ), [products, searchQuery, searchScope]);

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
    if (pageView === "categories") return undefined;
    const sectionIds: MobileNavSection[] = ["home", "contact"];
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

  useLayoutEffect(() => {
    if (!searchOpen) return undefined;
    const panel = searchPanelRef.current;
    const searchButton = searchButtonRef.current;
    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > :not(.menu-overlay)")];
    const backgroundState = backgroundElements.map((element) => ({ element, inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") }));
    backgroundElements.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    const handleSearchKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveHeaderDrawer("closed");
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.tabIndex >= 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleSearchKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleSearchKey);
      document.body.style.overflow = bodyOverflow;
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.requestAnimationFrame(() => {
        if (!document.querySelector('[role="dialog"][aria-modal="true"]')) searchButton?.focus();
      });
    };
  }, [searchOpen]);

  const currentCategory = categories.find((category) => category.id === activeCategory) ?? categories[0];
  const usesRouteNavigation = initialPage === "maintenance";

  const requestSectionScroll = (targetId: string) => {
    scrollRequestSequenceRef.current += 1;
    setScrollRequest({ targetId, sequence: scrollRequestSequenceRef.current });
  };

  const openCategory = (category: CategoryId) => {
    setPageView("home");
    setMobileNavSection("home");
    setActiveCategory(category);
    requestSectionScroll(`home-category-${category}`);
  };

  const openAllCategories = () => {
    setPageView("home");
    setMobileNavSection("home");
    requestSectionScroll("products");
  };

  const openHomeView = () => {
    setPageView("home");
    setMobileNavSection("home");
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
    if (section === "search") {
      setMobileNavSection("search");
      setActiveHeaderDrawer("search");
      return;
    }
    setPageView("home");
    setMobileNavSection(section);
    requestSectionScroll(mobileNavTargets[section]);
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

  const openSearch = () => {
    setActiveHeaderDrawer("search");
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
    const detailsHref = getProductDetailsHref(product);
    const categoryLine = getHomeProductCategoryLine(product);
    const brandLine = getHomeProductBrandLine(product);
    return <article className="product-card" data-category={product.category} data-product-id={product.id} key={product.id}>
      <Link className="product-card-link" href={detailsHref} aria-label={`عرض صفحة ${getProductDisplayName(product)}`} />
      <div className="product-image">{product.badge?.trim() && <span className="product-badge">{product.badge}</span>}<button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={favorites.includes(product.id)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" /></svg></button><div className="product-image-link">{product.category === "inks" ? <InkImageCarousel key={product.id} images={product.images?.length ? product.images : [product.image]} alt={getProductDisplayName(product)} variant="home-static" /> : <ProductImage src={product.image} alt={getProductDisplayName(product)} />}</div><button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)} aria-label={`تفاصيل سريعة لـ ${getProductDisplayName(product)}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.6"/></svg><span>تفاصيل سريعة</span></button></div>
      <div className="product-body">{brandLine && <span className="product-family" dir="auto">{brandLine}</span>}<h3>{getProductDisplayName(product)}</h3>{categoryLine && <span className="product-category-line" dir="auto">{categoryLine}</span>}</div>
    </article>;
  };

  return (
    <main id="main-content" tabIndex={-1} dir="rtl" className="home-page">
      {pageView === "home" && <h1 className="seo-page-title">وكالة إسحاق العالمية للطابعات والأوراق والأحبار</h1>}
      <div className="topbar">
        <div className="container topbar-inner">
          <span>📍 {settings.address}</span>
          <div className="topbar-links"><span>توصيل إلى جميع المحافظات</span><span className="topbar-customer"><a dir="ltr" href={customerPhoneHref} aria-label={`الاتصال بخدمة العملاء على الرقم ${customerPhoneDisplay}`}>خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone} aria-label={`نسخ رقم خدمة العملاء ${customerPhoneDisplay}`}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ"}</button></span></div>
        </div>
      </div>

      <header className={headerCompact ? "header compact" : "header"}>
        <div className="container nav-wrap">
          <button ref={menuButtonRef} className="menu-btn" type="button" onClick={openSiteMenu} aria-label="فتح القائمة" aria-controls="site-menu-drawer" aria-expanded={menuOpen}><span></span><span></span><span></span></button>
          {usesRouteNavigation
            ? <Link href="/" className="brand" aria-label="وكالة إسحاق العالمية"><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={190} height={78} sizes="(max-width: 760px) 140px, 194px" /></Link>
            : <a href="#home" className="brand" aria-label="وكالة إسحاق العالمية" onClick={(event) => { event.preventDefault(); openHomeView(); }}><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={190} height={78} sizes="(max-width: 760px) 140px, 194px" /></a>}
          <div className="header-left-actions">
            <button ref={favoritesButtonRef} type="button" className="favorite-counter" onClick={openWishlist} aria-label={favorites.length ? `فتح قائمة الرغبات، ${favorites.length} منتجات` : "فتح قائمة الرغبات"} aria-controls="wishlist-drawer" aria-expanded={favoritesOpen} aria-haspopup="dialog"><DrawerIcon name="heart"/>{favorites.length > 0 && <b>{favorites.length}</b>}</button>
            <button ref={searchButtonRef} type="button" className="header-search-button" onClick={openSearch} aria-label="فتح البحث" aria-controls="search-drawer" aria-expanded={searchOpen} aria-haspopup="dialog"><DrawerIcon name="search"/></button>
          </div>
        </div>
      </header>

      <div className={activeHeaderDrawer === "closed" ? "menu-overlay" : `menu-overlay open ${activeHeaderDrawer}-open`} aria-hidden={activeHeaderDrawer === "closed"} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveHeaderDrawer("closed"); }}>
        <aside ref={menuDrawerRef} id="site-menu-drawer" className="site-menu-drawer" role="dialog" aria-modal={menuOpen ? "true" : undefined} aria-hidden={!menuOpen} inert={!menuOpen} aria-labelledby="site-menu-title">
          <div className="drawer-header">
            <button ref={menuCloseRef} type="button" className="drawer-close" autoFocus={menuOpen} onClick={() => setActiveHeaderDrawer("closed")} aria-label="إغلاق القائمة"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            {usesRouteNavigation
              ? <Link href="/" className="drawer-brand" onClick={() => setActiveHeaderDrawer("closed")} aria-label="وكالة إسحاق العالمية"><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={176} height={72} sizes="176px" /></Link>
              : <a href="#home" className="drawer-brand" onClick={(event) => { event.preventDefault(); openHomeView(); }} aria-label="وكالة إسحاق العالمية"><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={176} height={72} sizes="176px" /></a>}
          </div>
          <h2 id="site-menu-title" className="drawer-title">القائمة الرئيسية</h2>
          <nav className="drawer-nav" aria-label="قائمة الموقع">
            {usesRouteNavigation ? <Link href="/" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="home"/><span>الرئيسية</span></Link> : <a href="#home" onClick={(event) => { event.preventDefault(); openHomeView(); }}><DrawerIcon name="home"/><span>الرئيسية</span></a>}
            <Link href="/categories" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="grid"/><span>جميع المنتجات</span></Link>
            <button type="button" onClick={openWishlist}><DrawerIcon name="heart"/><span>قائمة الرغبات</span>{favorites.length > 0 && <b>{favorites.length}</b>}</button>
            <button type="button" onClick={openSearch}><DrawerIcon name="search"/><span>البحث</span></button>
            <a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="headset"/><span>استشارات ومبيعات</span></a>
            <Link href="/maintenance" className={pageView === "maintenance" ? "active" : undefined} aria-current={pageView === "maintenance" ? "page" : undefined} onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="maintenance"/><span>الصيانة والدعم الفني</span></Link>
            {usesRouteNavigation ? <Link href="/#contact" onClick={() => setActiveHeaderDrawer("closed")}><DrawerIcon name="phone"/><span>تواصل معنا</span></Link> : <a href="#contact" onClick={(event) => { event.preventDefault(); openHomeSection("contact"); }}><DrawerIcon name="phone"/><span>تواصل معنا</span></a>}
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
        <aside ref={searchPanelRef} id="search-drawer" className="search-drawer" role="dialog" aria-modal={searchOpen ? "true" : undefined} aria-hidden={!searchOpen} inert={!searchOpen} aria-labelledby="search-drawer-title">
          <div className="search-drawer-header">
            <button type="button" className="drawer-close" onClick={() => setActiveHeaderDrawer("closed")} aria-label="إغلاق البحث"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
            <h2 id="search-drawer-title">ابحث في موقعنا</h2>
          </div>
          <div className="search-drawer-controls">
            <label className="search-scope-field" htmlFor="global-search-scope"><span>نطاق البحث</span><select id="global-search-scope" value={searchScope} onChange={(event) => setSearchScope(event.target.value as ProductSearchScope)}><option value="all">جميع الفئات</option><option value="printers">الطابعات</option><option value="inks">الأحبار</option><option value="papers">الأوراق</option></select></label>
            <label className="global-search-field" htmlFor="global-search-input"><span className="sr-only">البحث عن منتج</span><input ref={searchInputRef} id="global-search-input" type="search" dir="auto" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث عن منتج..." autoComplete="off"/><DrawerIcon name="search"/>{searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="مسح البحث"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg></button>}</label>
          </div>
          <div className="search-drawer-results" aria-live="polite">
            {!normalizedSearchQuery ? <div className="search-drawer-state"><DrawerIcon name="search"/><p>ابدأ بالبحث عن منتج</p><span>ابحث بالاسم أو الموديل أو النوع.</span></div> : matchingSearchProducts.length ? <><p className="search-result-count">{matchingSearchProducts.length} {matchingSearchProducts.length === 1 ? "نتيجة" : "نتائج"}</p><div className="search-results-list">{matchingSearchProducts.map((product) => <Link key={`${product.category}-${product.id}`} href={getProductDetailsHref(product)} className="search-result-item" onClick={() => setActiveHeaderDrawer("closed")}><span className="search-result-image"><Image src={imageSrcOrFallback(product.image)} alt="" width={88} height={88} sizes="72px" draggable={false}/></span><span className="search-result-copy"><strong dir="auto">{getProductDisplayName(product)}</strong><small dir="auto">{getHomeProductCategoryLine(product)}</small></span><svg className="search-result-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></Link>)}</div></> : <div className="search-drawer-state no-results" role="status"><h3>لا توجد نتائج مطابقة</h3><p>جرّب كلمة بحث أخرى أو اختر فئة مختلفة.</p></div>}
          </div>
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
        <div className="storefront-section-heading"><h2 id="storefront-categories-title">تسوق حسب الفئة</h2></div>
        <div className="storefront-category-grid">{homeCategoryOrder.map((categoryId) => {
          const categoryProducts = products.filter((product) => product.category === categoryId);
          const categoryImage = settings.categoryImages[categoryId] || categoryProducts[0]?.image || settings.logoImage;
          return <Link className="storefront-category-card" data-category={categoryId} href={PUBLIC_CATEGORY_DETAILS[categoryId].href} key={categoryId}><div className="storefront-category-image"><Image src={imageSrcOrFallback(categoryImage)} alt={PUBLIC_CATEGORY_DETAILS[categoryId].label} width={520} height={520} sizes="(max-width: 760px) 28vw, (max-width: 1100px) 22vw, 250px" /></div><h3>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h3></Link>;
        })}</div>
      </div></section>

      </>}

      {pageView === "home" && <>
      <section className="products-section" id="products"><div className="container">
        <div className="home-category-sections">{homeCategoryOrder.map((categoryId) => {
          const categoryProducts = products.filter((product) => product.category === categoryId);
          const productCards = categoryProducts.map(renderProductCard);
          return <section className="home-category-section" id={`home-category-${categoryId}`} key={categoryId}><div className="home-category-heading"><h2>{PUBLIC_CATEGORY_DETAILS[categoryId].label}</h2><a href={PUBLIC_CATEGORY_DETAILS[categoryId].href}>عرض الكل <span aria-hidden="true">←</span></a></div>{categoryProducts.length ? <HomeProductSlider products={productCards} label={PUBLIC_CATEGORY_DETAILS[categoryId].label} /> : <p className="home-category-empty">لا توجد منتجات في هذا القسم حاليًا.</p>}</section>;
        })}</div>
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

      <section className="services" id="services"><div className="container">
        <div className="center-heading"><h2>لماذا وكالة إسحاق؟</h2></div>
        <div className="services-grid"><article><div className="service-icon"><ServiceIcon name="consultation" /></div><div className="service-copy"><h3>استشارات قبل الشراء</h3><p>نقارن لك الخيارات ونحدد الأنسب حسب طبيعة عملك وميزانيتك.</p></div></article><article><div className="service-icon"><ServiceIcon name="setup" /></div><div className="service-copy"><h3>تجهيز وتركيب</h3><p>تهيئة الجهاز ومساعدتك على بدء الاستخدام بصورة صحيحة.</p></div></article><article><div className="service-icon"><ServiceIcon name="maintenance" /></div><div className="service-copy"><h3>صيانة ودعم فني</h3><p>فريق متخصص لمتابعة الأعطال والصيانة الدورية والمستلزمات.</p></div></article><article><div className="service-icon"><ServiceIcon name="delivery" /></div><div className="service-copy"><h3>توصيل آمن وسريع</h3><p>تغليف وتجهيز مناسب مع توصيل داخل صنعاء وإلى المحافظات.</p></div></article></div>
      </div></section>

      </>}

      {pageView === "maintenance" && <div className="maintenance-page">
        <section className="maintenance-page-hero" aria-labelledby="maintenance-page-title">
          <div className="maintenance-page-orb maintenance-page-orb-one"></div><div className="maintenance-page-orb maintenance-page-orb-two"></div>
          <div className="container maintenance-page-hero-inner">
            <nav className="maintenance-breadcrumb" aria-label="مسار التنقل"><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><span aria-current="page">الصيانة والدعم الفني</span></nav>
            <div className="maintenance-page-intro">
              <span className="maintenance-page-kicker">مركز الخدمة والدعم الفني</span>
              <h1 id="maintenance-page-title">الصيانة والدعم الفني</h1>
              <p>{settings.maintenanceDescription}</p>
              <a href="#maintenance-contact" className="maintenance-page-primary-link">تواصل مع قسم الصيانة <span aria-hidden="true">←</span></a>
            </div>
          </div>
        </section>

        <section className="maintenance-services" aria-labelledby="maintenance-services-title"><div className="container">
          <div className="maintenance-section-heading"><span>خدمات الصيانة</span><h2 id="maintenance-services-title">كيف يمكن لقسم الصيانة مساعدتك؟</h2></div>
          <div className="maintenance-service-list">{maintenanceServices.map((service, index) => <article key={service.title}>
            <span className="maintenance-service-number" aria-hidden="true">0{index + 1}</span>
            <div className="maintenance-service-icon"><DrawerIcon name="maintenance"/></div>
            <h3>{service.title}</h3><p>{service.description}</p>
          </article>)}</div>
        </div></section>

        <section className="maintenance-contact-section" id="maintenance-contact" aria-labelledby="maintenance-contact-title"><div className="container maintenance-contact-layout">
          <div className="maintenance-contact-intro"><span>قنوات التواصل المعتمدة</span><h2 id="maintenance-contact-title">{settings.maintenanceTitle}</h2><p>{settings.maintenanceDescription}</p></div>
          <div className="maintenance-contacts">
            {maintenanceContacts.map((contact) => <article className="maintenance-card" key={contact.phone}>
              <div className="maintenance-card-head"><span className="maintenance-icon"><DrawerIcon name="maintenance"/></span><div><small>{contact.label}</small><strong dir="ltr">{contact.display}</strong></div></div>
              <div className="maintenance-actions">
                <a className="maintenance-whatsapp" href={maintenanceWhatsappHref(contact.phone)} target="_blank" rel="noreferrer" aria-label={`واتساب ${contact.label} على الرقم ${contact.display}`}><DrawerIcon name="whatsapp"/> واتساب</a>
                <a className="maintenance-call" href={yemenTelHref(contact.phone)} aria-label={`اتصال هاتفي بـ ${contact.label} على الرقم ${contact.display}`}><DrawerIcon name="phone"/> اتصال هاتفي</a>
              </div>
            </article>)}
          </div>
        </div></section>
      </div>}

      <StorefrontFooter settings={settings} onHomeClick={usesRouteNavigation ? undefined : openHomeView} />

      {pageView === "home" && <a className="whatsapp-float" href={specialistWaLink(activeCategory)} target="_blank" rel="noreferrer" aria-label={`تواصل مع مختص قسم ${currentCategory.name}`}>مختص القسم <span>◉</span></a>}
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        {([
          ["home", "الرئيسية"],
          ["categories", "الفئات"],
          ["search", "البحث"],
          ["contact", "تواصل معنا"],
        ] as const).map(([section, label]) => {
          if (section === "categories") return <Link key={section} href="/categories"><MobileNavIcon section={section} /><span>{label}</span></Link>;
          if (usesRouteNavigation && section === "home") return <Link key={section} href="/"><MobileNavIcon section={section} /><span>{label}</span></Link>;
          if (usesRouteNavigation && section === "contact") return <Link key={section} href="/#contact"><MobileNavIcon section={section} /><span>{label}</span></Link>;
          return <button key={section} type="button" className={mobileNavSection === section ? "active" : ""} aria-current={mobileNavSection === section ? "page" : undefined} onClick={() => openMobileSection(section)}><MobileNavIcon section={section} /><span>{label}</span></button>;
        })}
      </nav>
      {selected && <QuickViewModal id={selected.id} title={getProductDisplayName(selected)} categoryLabel={categories.find((category) => category.id === selected.category)?.name ?? selected.family} family={selected.family} badge={selected.badge} availabilityLabel={selected.category === "papers" ? getPaperAvailabilityLabel(selected) : null} description={selected.description} price={selected.price} images={selected.images?.length ? selected.images : [selected.image]} rows={selectedSpecificationRows} detailsHref={selected.category === "printers" ? `/printers/${getPrinterSlug(selected)}` : selected.category === "inks" ? `/inks/${getInkSlug(selected)}` : `/papers/${getPaperSlug(selected)}`} whatsappHref={specialistWaLink(selected.category, selected)} whatsappLabel="اعرف السعر والتوفر" footerNote="سيرد عليك مختص القسم لتأكيد المواصفات والسعر الحالي." trigger={quickViewTrigger} onClose={closeQuickView} />}
    </main>
  );
}
