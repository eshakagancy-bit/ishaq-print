"use client";

import Image, { getImageProps } from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeMediaUrl } from "../lib/media-url";
import { isOpenInAden } from "./business-hours";
import {
  ALL_PRINTERS_FILTER,
  PRINTER_CATEGORIES,
  resolvePrinterCategory,
  type PrinterCategory,
  type PrinterCategoryFilter,
} from "./printer-categories";
import {
  buildQuickViewSpecificationRows,
  getProductCardSpecificationTags as getPrinterCardSpecificationTags,
  type PrinterSpecifications,
} from "./printer-specifications";
import {
  buildPaperSpecificationRows,
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

const HERO_IMAGE_SIZES = "(max-width: 460px) 94vw, (max-width: 760px) 410px, (max-width: 1200px) 48vw, 600px";
const DEFAULT_IMAGE_SRC = "/brand/eshak-logo.png";
const FAVORITES_STORAGE_KEY = "eshak-favorite-products";
const allowedImagePrefixes = ["/api/media/", "/brand/", "/hero/", "/products/"];

type Product = {
  id: number;
  name: string;
  family: string;
  image: string;
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

const categories = [
  { id: "printers", name: "طابعات EPSON", icon: "🖨️", description: "طابعات إبسون الأصلية للمكاتب والشركات" },
  { id: "laptops", name: "اللابتوبات", icon: "💻", description: "أجهزة محمولة للعمل والدراسة والاستخدام اليومي" },
  { id: "engraving-presses", name: "آلات النحت والمكابس", icon: "⚙️", description: "حلول النحت والكبس للمشاريع والورش" },
  { id: "inks", name: "الأحبار", icon: "💧", description: "أحبار أصلية وبدائل موثوقة لمختلف الاستخدامات" },
  { id: "papers", name: "الأوراق", icon: "📄", description: "أوراق الطباعة والتصوير والخامات المتخصصة" },
  { id: "advertising-machines", name: "آلات الدعاية والإعلان", icon: "✦", description: "معدات الطباعة والقص والإنتاج الإعلاني" },
  { id: "electronics", name: "الملحقات الإلكترونية", icon: "🔌", description: "ملحقات إلكترونية عملية للأجهزة والمكاتب" },
  { id: "cameras", name: "الكاميرات", icon: "📷", description: "كاميرات ومعدات تصوير للاستخدامات المختلفة" },
  { id: "3d-printers", name: "طابعات ثلاثية الأبعاد", icon: "◈", description: "طابعات وخامات 3D للنماذج والمشاريع" },
  { id: "money-machines", name: "آلات عد وفحص النقود", icon: "💵", description: "أجهزة دقيقة للعد والكشف وفحص العملات" },
  { id: "networks", name: "الشبكات وأجهزة الواي فاي", icon: "◉", description: "راوترات ونقاط وصول وحلول ربط الشبكات" },
] as const;

type CategoryId = typeof categories[number]["id"];
type DesktopCategoryMenu = "printers" | "machines" | "technology" | "more";

const machineCategoryIds: CategoryId[] = ["engraving-presses", "advertising-machines", "money-machines"];
const technologyCategoryIds: CategoryId[] = ["electronics", "cameras", "3d-printers", "networks"];
const directlyShownCategoryIds: CategoryId[] = ["printers", "inks", "papers", "laptops"];

function isCategoryId(value: string): value is CategoryId {
  return categories.some((category) => category.id === value);
}

function interleaveProductsByCategory(sourceProducts: Product[]) {
  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  const buckets = new Map<CategoryId, Product[]>();
  sourceProducts.forEach((product) => {
    const bucket = buckets.get(product.category) ?? [];
    bucket.push(product);
    buckets.set(product.category, bucket);
  });
  const orderedBuckets = [...buckets.entries()].sort(([firstCategory, firstProducts], [secondCategory, secondProducts]) =>
    secondProducts.length - firstProducts.length
    || (categoryOrder.get(firstCategory) ?? 0) - (categoryOrder.get(secondCategory) ?? 0)
  );
  const interleaved: Product[] = [];
  for (let productIndex = 0; interleaved.length < sourceProducts.length; productIndex += 1) {
    orderedBuckets.forEach(([, bucket]) => {
      if (bucket[productIndex]) interleaved.push(bucket[productIndex]);
    });
  }
  return interleaved;
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
  const category = isCategoryId(product.category) ? product.category : "printers";
  return {
    ...product,
    name: normalizeProductBrandName(product.name),
    family: category === "inks" ? "" : product.family,
    badge: category === "inks" ? undefined : product.badge,
    image: imageSrcOrFallback(product.image),
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
  const [filter, setFilter] = useState<PrinterCategoryFilter>(ALL_PRINTERS_FILTER.value);
  const [activeCategory, setActiveCategory] = useState<CategoryId>("printers");
  const [allCategoriesActive, setAllCategoriesActive] = useState(true);
  const [pageView, setPageView] = useState<PageView>("home");
  const [selected, setSelected] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [favoritesReady, setFavoritesReady] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopCategoryMenu, setDesktopCategoryMenu] = useState<DesktopCategoryMenu | null>(null);
  const [mobileNavSection, setMobileNavSection] = useState<MobileNavSection>("home");
  const [scrollRequest, setScrollRequest] = useState<{ targetId: string; sequence: number } | null>(null);
  const [customerPhoneCopied, setCustomerPhoneCopied] = useState(false);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [outgoingHeroSlide, setOutgoingHeroSlide] = useState<number | null>(null);
  const [heroPaused, setHeroPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const quickViewTriggerRef = useRef<HTMLElement | null>(null);
  const quickViewDialogRef = useRef<HTMLDivElement | null>(null);
  const quickViewCloseRef = useRef<HTMLButtonElement | null>(null);
  const categoryStripRef = useRef<HTMLElement | null>(null);
  const productGridRef = useRef<HTMLDivElement | null>(null);
  const heroTouchStartX = useRef<number | null>(null);
  const activeHeroSlideRef = useRef(0);
  const heroTransitionTimerRef = useRef<number | null>(null);
  const nextHeroPreloadRef = useRef<HTMLImageElement | null>(null);
  const scrollRequestSequenceRef = useRef(0);

  const customerPhone = normalizeYemenPhone(settings.customerServicePhone);
  const customerPhoneDisplay = customerPhone.replace(/^967/, "");
  const activeHero = heroSlides[activeHeroSlide] ?? defaultHeroSlides[0];
  const activeHeroImageSrc = imageSrcOrFallback(activeHero.imageUrl, defaultHeroSlides[0].imageUrl);
  const featureImageSrc = safeImageSrc(settings.featureImage);
  const favoriteProducts = products.filter((product) => favorites.includes(product.id));
  const businessIsOpen = isOpenInAden(currentTime, settings);

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
        window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
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
    const closeCategoryMenu = (event: PointerEvent) => {
      if (!categoryStripRef.current?.contains(event.target as Node)) setDesktopCategoryMenu(null);
    };
    document.addEventListener("pointerdown", closeCategoryMenu);
    return () => document.removeEventListener("pointerdown", closeCategoryMenu);
  }, []);

  useEffect(() => {
    if (!favoritesOpen || selected) return undefined;
    const closeDialog = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFavoritesOpen(false);
    };
    document.addEventListener("keydown", closeDialog);
    return () => document.removeEventListener("keydown", closeDialog);
  }, [favoritesOpen, selected]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = allCategoriesActive || product.category === activeCategory;
    const searchText = `${product.name} ${product.family} ${product.description}`.toLowerCase();
    const matchesQuery = searchText.includes(query.toLowerCase());
    const matchesFilter = allCategoriesActive || activeCategory !== "printers" ||
      filter === ALL_PRINTERS_FILTER.value ||
      product.printerCategory === filter;
    return matchesCategory && matchesQuery && matchesFilter;
  }), [products, query, filter, activeCategory, allCategoriesActive]);
  const orderedVisibleProducts = useMemo(
    () => allCategoriesActive ? interleaveProductsByCategory(visibleProducts) : visibleProducts,
    [allCategoriesActive, visibleProducts]
  );
  const productGroups = useMemo(() => {
    const groups: Product[][] = [];
    for (let index = 0; index < orderedVisibleProducts.length; index += 6) {
      groups.push(orderedVisibleProducts.slice(index, index + 6));
    }
    return groups;
  }, [orderedVisibleProducts]);

  const currentCategory = categories.find((category) => category.id === activeCategory) ?? categories[0];
  const machineCategories = categories.filter((category) => machineCategoryIds.includes(category.id));
  const technologyCategories = categories.filter((category) => technologyCategoryIds.includes(category.id));
  const moreCategories = categories.filter((category) =>
    !directlyShownCategoryIds.includes(category.id)
    && !machineCategoryIds.includes(category.id)
    && !technologyCategoryIds.includes(category.id)
  );
  const categoryVisuals = useMemo(() => new Map(categories.map((category) => {
    const customImage = settings.categoryImages[category.id];
    const productImage = products.find((product) => product.category === category.id)?.image;
    return [category.id, {
      src: customImage || productImage || DEFAULT_IMAGE_SRC,
      placeholder: !customImage && !productImage,
    }];
  })), [products, settings.categoryImages]);
  const allProductsVisual = settings.categoryImages["all-products"] || "/hero/technology-solutions.png";

  const requestSectionScroll = (targetId: string) => {
    scrollRequestSequenceRef.current += 1;
    setScrollRequest({ targetId, sequence: scrollRequestSequenceRef.current });
  };

  const scrollProductGroups = (direction: "next" | "previous") => {
    const grid = productGridRef.current;
    if (!grid) return;
    grid.scrollBy({
      left: direction === "next" ? -grid.clientWidth : grid.clientWidth,
      behavior: "smooth",
    });
  };

  const openCategory = (category: CategoryId) => {
    setDesktopCategoryMenu(null);
    setPageView("home");
    setMobileNavSection("home");
    setAllCategoriesActive(false);
    setActiveCategory(category);
    setFilter(ALL_PRINTERS_FILTER.value);
    setQuery("");
    requestSectionScroll("products");
  };

  const openAllCategories = () => {
    setDesktopCategoryMenu(null);
    setPageView("home");
    setMobileNavSection("home");
    setAllCategoriesActive(true);
    setFilter(ALL_PRINTERS_FILTER.value);
    setQuery("");
    requestSectionScroll("products");
  };

  const openPrinterFilter = (printerFilter: PrinterCategory) => {
    setDesktopCategoryMenu(null);
    setPageView("home");
    setMobileNavSection("home");
    setAllCategoriesActive(false);
    setActiveCategory("printers");
    setFilter(printerFilter);
    setQuery("");
    requestSectionScroll("products");
  };

  const openHomeView = () => {
    setPageView("home");
    setMobileNavSection("home");
    setAllCategoriesActive(true);
    setFilter(ALL_PRINTERS_FILTER.value);
    setQuery("");
    setMenuOpen(false);
    requestSectionScroll("home");
  };

  const openCategoriesView = () => {
    setPageView("categories");
    setMobileNavSection("categories");
    setDesktopCategoryMenu(null);
    setMenuOpen(false);
    requestSectionScroll("categories");
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
    if (section === "categories") {
      openCategoriesView();
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

  const heroButtonHref = (url: string) => url === "whatsapp" ? generalWaLink(settings.generalWhatsapp) : url.replace(/\?category=.*/, "");

  const handleHeroButtonClick = (url: string, buttonText = "") => {
    const category = url.match(/category=([a-z0-9-]+)/)?.[1];
    if (category && categories.some((item) => item.id === category)) {
      openCategory(category as CategoryId);
    } else if (url.startsWith("#products") && buttonText.includes("الطابعات")) {
      openCategory("printers");
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
  const openQuickView = useCallback((product: Product, trigger: HTMLElement | null = null) => {
    quickViewTriggerRef.current = trigger
      ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
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

  useEffect(() => {
    if (!selected) return undefined;

    const dialog = quickViewDialogRef.current;
    if (!dialog) return undefined;

    const backgroundElements = [...document.querySelectorAll<HTMLElement>("main > :not(.modal-backdrop)")];
    const backgroundState = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    for (const element of backgroundElements) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusCloseButton = window.requestAnimationFrame(() => quickViewCloseRef.current?.focus());
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeQuickView();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true");
      if (!focusableElements.length) {
        event.preventDefault();
        quickViewCloseRef.current?.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === firstFocusable || !dialog.contains(activeElement))) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && (activeElement === lastFocusable || !dialog.contains(activeElement))) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusCloseButton);
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      for (const { element, inert, ariaHidden } of backgroundState) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }

      const trigger = quickViewTriggerRef.current;
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus();
        else document.querySelector<HTMLElement>(".favorite-counter")?.focus();
      });
    };
  }, [closeQuickView, selected]);

  return (
    <main dir="rtl" className="home-page">
      <div className="topbar">
        <div className="container topbar-inner">
          <span>📍 {settings.address}</span>
          <div className="topbar-links"><span>توصيل إلى جميع المحافظات</span><span className="topbar-customer"><a dir="ltr" href={`tel:+${customerPhone}`} aria-label={`الاتصال بخدمة العملاء على الرقم ${customerPhoneDisplay}`}>خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone} aria-label={`نسخ رقم خدمة العملاء ${customerPhoneDisplay}`}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ"}</button></span></div>
        </div>
      </div>

      <header className="header">
        <div className="container nav-wrap">
          <a href="#home" className="brand" aria-label="وكالة إسحاق العالمية" onClick={(event) => { event.preventDefault(); openHomeView(); }}><Image src={imageSrcOrFallback(settings.logoImage)} alt="شعار وكالة إسحاق العالمية" width={190} height={78} sizes="(max-width: 760px) 140px, 194px" /></a>
          <nav id="mobile-site-menu" className={menuOpen ? "nav-links open" : "nav-links"} aria-label="التنقل الرئيسي">
            <a href="#home" aria-current={pageView === "home" ? "page" : undefined} onClick={(event) => { event.preventDefault(); openHomeView(); }}>الرئيسية</a>
            <a href="#categories" aria-current={pageView === "categories" ? "page" : undefined} onClick={(event) => { event.preventDefault(); openCategoriesView(); }}>الأقسام</a>
            <a href="#maintenance" onClick={(event) => { event.preventDefault(); openHomeSection("maintenance"); }}>الصيانة</a>
            <a href="#services" onClick={(event) => { event.preventDefault(); openHomeSection("services"); }}>خدماتنا</a>
            <a href="#products" onClick={(event) => { event.preventDefault(); openCategory("printers"); }}>طابعات EPSON</a>
            <a href="#contact" onClick={(event) => { event.preventDefault(); openHomeSection("contact"); }}>تواصل معنا</a>
            <a href="/admin" className="mobile-admin-nav">لوحة التحكم</a>
          </nav>
          <div className="nav-actions">
            <button type="button" className="favorite-counter" onClick={() => setFavoritesOpen(true)} aria-label={`فتح المفضلة، ${favorites.length} منتجات`}><span>♡</span><b>{favorites.length}</b></button>
            <a className="admin-link" href="/admin">لوحة التحكم</a>
            <a className="nav-contact" href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">اطلب استشارة</a>
            <button className="menu-btn" type="button" onClick={() => setMenuOpen((current) => !current)} aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-controls="mobile-site-menu" aria-expanded={menuOpen}><span></span><span></span><span></span></button>
          </div>
        </div>
      </header>

      <nav ref={categoryStripRef} className="category-strip" aria-label="أقسام المنتجات">
        <div className="container category-strip-list">
          <button type="button" className={pageView === "home" && allCategoriesActive ? "active" : ""} onClick={openAllCategories} aria-current={pageView === "home" && allCategoriesActive ? "page" : undefined}>جميع المنتجات</button>
          <div
            className={desktopCategoryMenu === "printers" ? "category-strip-item open" : "category-strip-item"}
            onMouseEnter={() => setDesktopCategoryMenu("printers")}
            onMouseLeave={() => setDesktopCategoryMenu(null)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDesktopCategoryMenu(null); }}
          >
            <button
              type="button"
              className={pageView === "home" && !allCategoriesActive && activeCategory === "printers" ? "category-strip-trigger active" : "category-strip-trigger"}
              onClick={() => {
                if (pageView === "categories" || allCategoriesActive || activeCategory !== "printers") openCategory("printers");
                setDesktopCategoryMenu((current) => current === "printers" ? null : "printers");
              }}
              aria-haspopup="menu"
              aria-expanded={desktopCategoryMenu === "printers"}
            >طابعات EPSON<span className="category-menu-chevron" aria-hidden="true">⌄</span></button>
            <div className="category-dropdown-desktop printer-mega-menu" role="menu" aria-label="تصنيفات طابعات EPSON">
              <strong>اختر فئة الطابعة</strong>
              <div>{PRINTER_CATEGORIES.map((printerCategory) => <button
                key={printerCategory.value}
                type="button"
                className={pageView === "home" && activeCategory === "printers" && filter === printerCategory.value ? "active" : ""}
                onClick={() => openPrinterFilter(printerCategory.value)}
                role="menuitem"
              >{printerCategory.label.split(" (")[0]}</button>)}</div>
            </div>
          </div>
          {(["inks", "papers", "laptops"] as CategoryId[]).map((categoryId) => {
            const category = categories.find((item) => item.id === categoryId);
            return category && <button key={category.id} type="button" className={pageView === "home" && !allCategoriesActive && activeCategory === category.id ? "active" : ""} onClick={() => openCategory(category.id)}>{category.name}</button>;
          })}
          {([
            { id: "machines", label: "الماكينات", items: machineCategories },
            { id: "technology", label: "التقنية", items: technologyCategories },
            { id: "more", label: "المزيد", items: moreCategories },
          ] as const).map((group) => {
            const groupActive = pageView === "home" && !allCategoriesActive && group.items.some((category) => category.id === activeCategory);
            return <div
              key={group.id}
              className={desktopCategoryMenu === group.id ? "category-strip-item open" : "category-strip-item"}
              onMouseEnter={() => setDesktopCategoryMenu(group.id)}
              onMouseLeave={() => setDesktopCategoryMenu(null)}
              onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDesktopCategoryMenu(null); }}
            >
              <button
                type="button"
                className={groupActive ? "category-strip-trigger active" : "category-strip-trigger"}
                onClick={() => setDesktopCategoryMenu((current) => current === group.id ? null : group.id)}
                aria-haspopup="menu"
                aria-expanded={desktopCategoryMenu === group.id}
              >{group.label}<span className="category-menu-chevron" aria-hidden="true">⌄</span></button>
              <div className="category-dropdown-desktop" role="menu" aria-label={`أقسام ${group.label}`}>
                {group.items.length ? group.items.map((category) => <button
                  key={category.id}
                  type="button"
                  className={pageView === "home" && !allCategoriesActive && activeCategory === category.id ? "active" : ""}
                  onClick={() => openCategory(category.id)}
                  role="menuitem"
                >{category.name}</button>) : <span className="category-dropdown-empty">جميع الأقسام ظاهرة في الشريط</span>}
              </div>
            </div>;
          })}
        </div>
      </nav>

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
          <div className="hero-copy" key={`hero-copy-${activeHero.id}`} aria-live="polite">
            <span className="eyebrow">{activeHero.subtitle}</span>
            <h1>{activeHero.title}</h1>
            <p>{activeHero.description}</p>
            <div className="hero-buttons">
              <a
                className="primary-btn"
                href={heroButtonHref(activeHero.primaryButtonUrl)}
                target={activeHero.primaryButtonUrl.startsWith("http") ? "_blank" : undefined}
                rel={activeHero.primaryButtonUrl.startsWith("http") ? "noreferrer" : undefined}
                onClick={(event) => {
                  if (activeHero.primaryButtonUrl !== "whatsapp" && !activeHero.primaryButtonUrl.startsWith("http")) event.preventDefault();
                  handleHeroButtonClick(activeHero.primaryButtonUrl, activeHero.primaryButtonText);
                }}
              >
                {activeHero.primaryButtonText} <span>←</span>
              </a>
              <a
                className="secondary-btn"
                href={heroButtonHref(activeHero.secondaryButtonUrl)}
                target={activeHero.secondaryButtonUrl === "whatsapp" || activeHero.secondaryButtonUrl.startsWith("http") ? "_blank" : undefined}
                rel={activeHero.secondaryButtonUrl === "whatsapp" || activeHero.secondaryButtonUrl.startsWith("http") ? "noreferrer" : undefined}
                onClick={(event) => {
                  if (activeHero.secondaryButtonUrl !== "whatsapp" && !activeHero.secondaryButtonUrl.startsWith("http")) event.preventDefault();
                  handleHeroButtonClick(activeHero.secondaryButtonUrl, activeHero.secondaryButtonText);
                }}
              >
                {activeHero.secondaryButtonText}
              </a>
            </div>
            <div className="hero-trust"><div><strong>ضمان</strong><span>منتجات موثوقة</span></div><div><strong>دعم</strong><span>قبل وبعد البيع</span></div><div><strong>توريد</strong><span>حلول متكاملة</span></div></div>
          </div>
          <div className="hero-visual" key={`hero-visual-${activeHero.id}`}>
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
        <label className="search-field" id="general-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => updateProductSearch(event.target.value)} placeholder={allCategoriesActive ? "ابحث في جميع المنتجات..." : `ابحث داخل قسم ${currentCategory.name}...`} aria-label="البحث في المنتجات المعروضة" /></label>
        <div className="quick-points"><span>✓ أسعار منافسة</span><span>✓ منتجات موثوقة</span><span>✓ دعم فني متخصص</span></div>
      </div></section>
      </>}

      {pageView === "categories" && <section className="categories-section categories-view" id="categories"><div className="container">
        <div className="center-heading categories-heading"><span className="section-kicker">أقسامنا التجارية</span><h2>اختر القسم الذي تبحث عنه</h2><p>تصفح أقسامنا المتنوعة واختر المنتجات التي تناسب احتياجاتك.</p></div>
        <div className="category-grid">
          <article className={allCategoriesActive ? "category-card active" : "category-card"}>
            <button type="button" className="category-main" onClick={openAllCategories} aria-label="عرض جميع المنتجات">
              <span className="category-image">
                <Image src={allProductsVisual} alt="" fill sizes="(max-width: 760px) 31vw, (max-width: 1200px) 20vw, 190px" />
              </span>
              <b>جميع المنتجات</b>
            </button>
          </article>
          {categories.map((category) => {
            const visual = categoryVisuals.get(category.id) ?? { src: DEFAULT_IMAGE_SRC, placeholder: true };
            return <article key={category.id} className={!allCategoriesActive && activeCategory === category.id ? "category-card active" : "category-card"}>
              <button type="button" className="category-main" onClick={() => openCategory(category.id)} aria-label={`فتح قسم ${category.name}`}>
                <span className={visual.placeholder ? "category-image placeholder" : "category-image"}>
                  <Image src={visual.src} alt="" fill sizes="(max-width: 760px) 31vw, (max-width: 1200px) 20vw, 190px" />
                  {visual.placeholder && <small>صورة مؤقتة</small>}
                </span>
                <b>{category.name}</b>
              </button>
            </article>;
          })}
        </div>
      </div></section>}

      {pageView === "home" && <>
      <section className="products-section" id="products"><div className="container">
        {!allCategoriesActive && activeCategory === "printers" && <div className="filters" role="group" aria-label="تصنيف طابعات إبسون">{[ALL_PRINTERS_FILTER, ...PRINTER_CATEGORIES].map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>}
        {orderedVisibleProducts.length ? <><div className="product-group-controls" aria-label="التنقل بين مجموعات المنتجات">
          <button type="button" onClick={() => scrollProductGroups("previous")} aria-label="مجموعة المنتجات السابقة">→</button>
          <button type="button" onClick={() => scrollProductGroups("next")} aria-label="مجموعة المنتجات التالية">←</button>
        </div><div className="product-grid" ref={productGridRef}>{productGroups.map((group, groupIndex) => <div className="product-group" key={`${allCategoriesActive ? "all" : activeCategory}-${filter}-${query}-${groupIndex}-${group[0]?.id ?? "empty"}`}>{group.map((product) => {
          const cardTags = getProductCardSpecificationTags(product);
          return <article className="product-card" data-category={product.category} key={product.id}>
            <div className="product-image">{product.badge?.trim() && <span className="product-badge">{product.badge}</span>}<button type="button" className={favorites.includes(product.id) ? "heart active" : "heart"} onClick={() => toggleFavorite(product.id)} aria-label={favorites.includes(product.id) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}>♥</button>{product.category === "printers" ? <button type="button" className="product-image-trigger" onClick={(event) => openQuickView(product, event.currentTarget)} aria-label={`عرض التفاصيل السريعة لـ ${getProductDisplayName(product)}`}><Image src={imageSrcOrFallback(product.image)} alt={getProductDisplayName(product)} width={560} height={440} sizes="(max-width: 760px) 88vw, (max-width: 1000px) 44vw, 360px" loading="lazy" /></button> : <Image src={imageSrcOrFallback(product.image)} alt={getProductDisplayName(product)} width={560} height={440} sizes="(max-width: 760px) 88vw, (max-width: 1000px) 44vw, 360px" loading="lazy" />}<button type="button" className="quick-view" onClick={(event) => openQuickView(product, event.currentTarget)}>{product.category === "printers" ? "تفاصيل سريعة" : "عرض سريع"}</button></div>
            <div className="product-body">{product.family && <span className="product-family">{product.family}</span>}<h3>{getProductDisplayName(product)}</h3>{product.description && <p>{product.description}</p>}{cardTags.length > 0 && <div className="product-tags">{cardTags.map((tag) => <span key={tag}>{tag}</span>)}</div>}<div className="product-footer"><div className="price"><small>السعر</small><strong>{product.price || "اطلب عرض سعر"}</strong></div><a href={specialistWaLink(product.category, product)} target="_blank" rel="noreferrer">اطلب من المختص</a></div></div>
          </article>;
        })}</div>)}</div></> : <div className="empty-state"><span className="empty-icon">{currentCategory.icon}</span><b>{query ? "لم نعثر على هذا المنتج" : `سيتم إضافة منتجات ${currentCategory.name} قريبًا`}</b><p>{query ? "جرّب البحث باسم آخر أو تواصل معنا وسنساعدك." : "سيتم إضافة منتجات هذا القسم قريبًا. يمكنك التواصل مع مختص القسم لمعرفة المنتجات المتوفرة حاليًا"}</p><div className="empty-actions">{query ? <button type="button" onClick={() => { setQuery(""); setFilter(ALL_PRINTERS_FILTER.value); }}>عرض جميع المنتجات</button> : <a className="empty-specialist" href={specialistWaLink(activeCategory)} target="_blank" rel="noreferrer">تواصل مع مختص القسم</a>}</div></div>}
      </div></section>

      <section className="feature-band" id="about"><div className="container feature-band-inner">
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

      <section className="contact-banner" id="contact"><div className="container contact-banner-inner"><div><span>{settings.contactKicker}</span><h2>{settings.contactTitle}</h2><p className="contact-address">📍 {settings.address}</p></div><div className="contact-actions"><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">واتساب: {settings.generalWhatsapp.replace("967", "")}</a><a href={`tel:+${customerPhone}`} className="outline" dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم نسخ الرقم ✓" : "نسخ الرقم"}</button></div></div></section>

      <footer><div className="container footer-grid">
        <div className="footer-brand"><Image src={imageSrcOrFallback(settings.logoImage)} alt="وكالة إسحاق العالمية" width={210} height={90} sizes="190px" loading="lazy" /><p>حلول تقنية وتجارية وتجهيزات موثوقة للأفراد والشركات والمؤسسات في اليمن.</p></div>
        <div><h3>روابط سريعة</h3><a href="#home" onClick={(event) => { event.preventDefault(); openHomeView(); }}>الرئيسية</a><a href="#categories" onClick={(event) => { event.preventDefault(); openCategoriesView(); }}>جميع الأقسام</a><a href="#maintenance">الصيانة</a><a href="#products">طابعات EPSON</a><a href="#services">خدماتنا</a></div>
        <div><h3>تواصل معنا</h3><a href={`tel:+${customerPhone}`} dir="ltr">خدمة العملاء: {customerPhoneDisplay}</a><button className="footer-copy-phone" type="button" onClick={copyCustomerPhone}>{customerPhoneCopied ? "تم النسخ ✓" : "نسخ الرقم"}</button><a href={`tel:${settings.salesPhone}`}>{settings.salesPhone}</a><a href={generalWaLink(settings.generalWhatsapp)} target="_blank" rel="noreferrer">{settings.generalWhatsapp.replace("967", "")}</a><p>{settings.address}</p></div>
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
        ] as const).map(([section, label]) => <button
          key={section}
          type="button"
          className={mobileNavSection === section ? "active" : ""}
          aria-current={mobileNavSection === section ? "page" : undefined}
          onClick={() => openMobileSection(section)}
        ><MobileNavIcon section={section} /><span>{label}</span></button>)}
      </nav>
      {favoritesOpen && <div className="modal-backdrop favorites-backdrop" onMouseDown={() => setFavoritesOpen(false)}><aside className="favorites-panel" role="dialog" aria-modal="true" aria-labelledby="favorites-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="favorites-header"><div><span>قائمتك المحفوظة</span><h2 id="favorites-title">المفضلة ({favorites.length})</h2></div><button type="button" onClick={() => setFavoritesOpen(false)} aria-label="إغلاق المفضلة">×</button></div>
        {favoriteProducts.length ? <div className="favorites-list">{favoriteProducts.map((product) => <article key={product.id}><Image src={imageSrcOrFallback(product.image)} alt={getProductDisplayName(product)} width={110} height={90} sizes="76px" /><div><b>{getProductDisplayName(product)}</b><span>{product.family}</span><div className="favorite-actions"><button type="button" onClick={(event) => { setFavoritesOpen(false); openQuickView(product, event.currentTarget); }}>عرض المنتج</button><button type="button" className="remove-favorite" onClick={() => toggleFavorite(product.id)}>إزالة</button></div></div></article>)}</div> : <p className="favorites-empty">لم تقم بإضافة أي منتجات إلى المفضلة بعد</p>}
        {favoriteProducts.length > 0 && <button type="button" className="clear-favorites" onClick={() => setFavorites([])}>مسح المفضلة</button>}
      </aside></div>}
      {selected && <div className="modal-backdrop" onMouseDown={closeQuickView}><div ref={quickViewDialogRef} className="product-modal-shell" role="dialog" aria-modal="true" aria-labelledby={`product-dialog-title-${selected.id}`} onMouseDown={(event) => event.stopPropagation()}><button ref={quickViewCloseRef} type="button" className="modal-close" onClick={closeQuickView} aria-label="إغلاق">×</button><div className="product-modal"><div className="modal-image"><Image src={imageSrcOrFallback(selected.image)} alt={getProductDisplayName(selected)} width={700} height={600} sizes="(max-width: 760px) 90vw, 405px" loading="eager" /></div><div className="modal-content">{selected.badge?.trim() && <span className="modal-product-badge">{selected.badge}</span>}{selected.family && <span className="product-family">{selected.family}</span>}<h2 id={`product-dialog-title-${selected.id}`}>{getProductDisplayName(selected)}</h2>{selected.description && <p>{selected.description}</p>}<div className="modal-price"><small>السعر</small><strong>{selected.price?.trim() || "اطلب عرض سعر"}</strong></div>{selectedSpecificationRows.length > 0 && <dl className="modal-specs">{selectedSpecificationRows.map((row) => <div key={row.key} className={row.state === false ? "negative" : row.state === true ? "positive" : ""}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}{selected.category === "printers" && <a className="secondary-btn modal-more-details" href={`/printers/${getPrinterSlug(selected)}`}>تفاصيل أكثر <span>←</span></a>}{selected.category === "inks" && <a className="secondary-btn modal-more-details" href={`/inks/${getInkSlug(selected)}`}>تفاصيل أكثر <span>←</span></a>}<a className="primary-btn" href={specialistWaLink(selected.category, selected)} target="_blank" rel="noreferrer">اسأل المختص عن السعر والتوفر <span>←</span></a><small>سيرد عليك مختص القسم لتأكيد المواصفات والسعر الحالي.</small></div></div></div></div>}
    </main>
  );
}
