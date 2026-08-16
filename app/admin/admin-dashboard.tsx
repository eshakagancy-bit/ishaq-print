/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, FormEvent, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MAX_IMAGE_UPLOAD_BYTES, isSupportedImageMimeType } from "../../lib/image-file-validation";
import { MEDIA_PROXY_PATH_PREFIX, normalizeMediaUrl } from "../../lib/media-url";
import { optimizeImageForUpload } from "../image-upload-optimizer";
import { businessWeekdays, formatArabicBusinessHours, normalizeBusinessTime, sanitizePhoneNumber } from "../business-hours";
import { PRINTER_CATEGORIES, getPrinterCategoryLabel, isPrinterCategory, resolvePrinterCategory } from "../printer-categories";
import {
  ADF_DUPLEX_TYPE_OPTIONS,
  AVAILABILITY_MODE_OPTIONS,
  BOOLEAN_SPECIFICATION_FIELDS,
  DUPLEX_MODE_OPTIONS,
  ECOTANK_BOOLEAN_SPECIFICATION_FIELDS,
  INK_SYSTEM_OPTIONS,
  INK_TYPE_OPTIONS,
  LQ_INTERFACE_SPECIFICATION_FIELDS,
  PAPER_SIZE_OPTIONS,
  PRINT_LANGUAGE_OPTIONS,
  PRICE_MODE_OPTIONS,
  PRINTER_FAMILY_OPTIONS,
  PRINTER_FUNCTION_OPTIONS,
  PRINTER_TYPE_OPTIONS,
  PRINTER_USAGE_OPTIONS,
  PRODUCT_BADGE_OPTIONS,
  SPEED_UNIT_OPTIONS,
  TRI_STATE_OPTIONS,
  adfDuplexTypeToFormValue,
  availabilityModeToFormValue,
  createEmptyPrinterSpecifications,
  duplexModeToFormValue,
  formValueToAdfDuplexType,
  formValueToAvailabilityMode,
  formValueToInkSystem,
  formValueToTriState,
  formValueToDuplexMode,
  inkSystemToFormValue,
  suggestPrinterFamily,
  triStateToFormValue,
  type PriceMode,
  type PrinterSpecifications,
  type TriState,
} from "../printer-specifications";
import {
  PAPER_AVAILABILITY_OPTIONS,
  PAPER_PRINTER_COMPATIBILITY_OPTIONS,
  PAPER_PRINT_SIDE_OPTIONS,
  PAPER_SIZE_OPTIONS as PAPER_PRODUCT_SIZE_OPTIONS,
  PAPER_SURFACE_OPTIONS,
  PAPER_TYPE_OPTIONS,
  PAPER_USAGE_OPTIONS,
  createEmptyPaperSpecifications,
  isDoubleSidePaperType,
  isSelfAdhesivePaperType,
  isSublimationPaperType,
  type PaperAvailability,
  type PaperPrintSides,
  type PaperSpecifications,
} from "../paper-specifications";
import {
  INK_CAPACITY_OPTIONS,
  INK_COLOR_COUNT_OPTIONS,
  INK_TYPE_OPTIONS as PRODUCT_INK_TYPE_OPTIONS,
  createEmptyInkSpecifications,
  getInkProductNameError,
  type InkSpecifications,
} from "../ink-specifications";
import { categoryImageDefinitions, defaultCategoryImages, defaultHeroSettings, defaultSiteSettings, type CategoryImageKey, type HeroSettings, type HeroSlide, type ProductPurchaseBenefits, type SiteSettings, type StoredProduct } from "../site-defaults";
import {
  createEmptyPrinterPageContent,
  type PrinterPageContent,
} from "../printer-page-content";
import { addProductToCollection, removeProductById, replaceProductById } from "../product-collection";
import {
  HOME_PRODUCT_CATEGORIES,
  buildHomeProductOrder,
  homeProductsForCategory,
  moveHomeProduct,
  type HomeProductCategory,
} from "../home-product-order";

const categories = [
  ["printers", "طابعات EPSON"], ["laptops", "اللابتوبات"], ["engraving-presses", "آلات النحت والمكابس"],
  ["inks", "الأحبار"], ["papers", "الأوراق"], ["advertising-machines", "آلات الدعاية والإعلان"],
  ["electronics", "الملحقات الإلكترونية"], ["cameras", "الكاميرات"], ["3d-printers", "طابعات ثلاثية الأبعاد"],
  ["money-machines", "آلات عد وفحص النقود"], ["networks", "الشبكات وأجهزة الواي فاي"],
] as const;

const homeOrderCategoryLabels: Record<HomeProductCategory, string> = {
  printers: "الطابعات Printers",
  papers: "الأوراق Papers",
  inks: "الأحبار Inks",
};

const emptyProduct: StoredProduct = {
  id: 0, name: "", family: "", image: "", images: undefined, category: "printers", type: "", size: "",
  printerCategory: undefined, badge: "", price: "", description: "", features: [],
  specifications: undefined, printerPageContent: createEmptyPrinterPageContent(), paperSpecifications: undefined,
  inkSpecifications: undefined,
};

const emptyHeroSlide: HeroSlide = {
  id: 0,
  title: "",
  subtitle: "",
  description: "",
  badgeText: "",
  imageUrl: "",
  imageAlt: "",
  primaryButtonText: "",
  primaryButtonUrl: "#categories",
  secondaryButtonText: "",
  secondaryButtonUrl: "whatsapp",
  displayOrder: 0,
  isActive: true,
};

const UNSAVED_CHANGES_MESSAGE = "توجد تعديلات لم يتم حفظها. هل تريد مغادرة الصفحة؟";
type DirtyScope = "site" | "product-form" | "hero-form" | "hero-settings" | "home-order";

function normalizeAdminProducts(products: StoredProduct[]) {
  return products.map((product) => ({
    ...product,
    image: normalizeMediaUrl(product.image),
    images: product.category === "inks"
      ? (product.images?.length ? product.images : [product.image]).map((image) => normalizeMediaUrl(image)).filter(Boolean)
      : product.images,
    printerCategory: product.category === "printers"
      ? resolvePrinterCategory(product.printerCategory, product.name)
      : undefined,
  }));
}

export default function AdminDashboard({ userName, signOutPath }: { userName: string; signOutPath: string }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [productForm, setProductForm] = useState<StoredProduct>(emptyProduct);
  const [featuresText, setFeaturesText] = useState("");
  const [priceMode, setPriceMode] = useState<PriceMode>("quote");
  const [printerCategoryError, setPrinterCategoryError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultHeroSettings);
  const [heroForm, setHeroForm] = useState<HeroSlide>(emptyHeroSlide);
  const [editingHeroId, setEditingHeroId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"page" | "ads" | "category-images" | "hero" | "home-order" | "products">("page");
  const [status, setStatus] = useState("جاري تحميل بيانات الموقع...");
  const [saving, setSaving] = useState(false);
  const [heroSaving, setHeroSaving] = useState(false);
  const [homeOrderSaving, setHomeOrderSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dirtyScopes, setDirtyScopes] = useState<DirtyScope[]>([]);
  const pendingMediaDeletes = useRef(new Set<string>());
  const pendingUploadedMedia = useRef(new Set<string>());
  const hasUnsavedChanges = dirtyScopes.length > 0;

  const markDirty = (scope: DirtyScope) => setDirtyScopes((current) => current.includes(scope) ? current : [...current, scope]);
  const clearDirty = (scope: DirtyScope) => setDirtyScopes((current) => current.filter((item) => item !== scope));

  useEffect(() => {
    fetch("/api/site").then(async (response) => {
      const data = await response.json() as { error?: string; settings?: Partial<SiteSettings>; products?: StoredProduct[] };
      if (!response.ok) throw new Error(data.error || "تعذر التحميل");
      const nextSettings = { ...defaultSiteSettings, ...data.settings };
      setSettings({
        ...nextSettings,
        logoImage: normalizeMediaUrl(nextSettings.logoImage),
        featureImage: normalizeMediaUrl(nextSettings.featureImage),
        categoryImages: Object.fromEntries(Object.entries({
          ...defaultCategoryImages,
          ...nextSettings.categoryImages,
        }).map(([key, value]) => [key, normalizeMediaUrl(value)])) as SiteSettings["categoryImages"],
      });
      setProducts(Array.isArray(data.products) ? normalizeAdminProducts(data.products) : []);
      setStatus("تم تحميل البيانات");
    }).catch((error) => setStatus(error instanceof Error ? error.message : "تعذر تحميل البيانات"));
  }, []);

  useEffect(() => {
    fetch("/api/admin/hero-slides").then(async (response) => {
      const data = await response.json() as { error?: string; slides?: HeroSlide[]; settings?: Partial<HeroSettings> };
      if (!response.ok) throw new Error(data.error || "تعذر تحميل بيانات البانر");
      setHeroSlides(Array.isArray(data.slides)
        ? data.slides.map((slide) => ({ ...slide, imageUrl: normalizeMediaUrl(slide.imageUrl) }))
        : []);
      setHeroSettings({ ...defaultHeroSettings, ...data.settings });
    }).catch((error) => setStatus(error instanceof Error ? error.message : "تعذر تحميل بيانات البانر"));
  }, []);

  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = UNSAVED_CHANGES_MESSAGE;
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const cleanupUnusedUploads = () => {
      for (const url of pendingUploadedMedia.current) {
        void fetch("/api/upload", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
          keepalive: true,
        });
      }
    };
    window.addEventListener("pagehide", cleanupUnusedUploads);
    return () => window.removeEventListener("pagehide", cleanupUnusedUploads);
  }, []);

  const updateSetting = (key: keyof SiteSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    markDirty("site");
  };

  const updatePurchaseBenefits = (patch: Partial<ProductPurchaseBenefits>) => {
    setSettings((current) => ({
      ...current,
      productPurchaseBenefits: { ...current.productPurchaseBenefits, ...patch },
    }));
    markDirty("site");
  };

  const updateCategoryImage = (key: CategoryImageKey, value: string) => {
    setSettings((current) => ({
      ...current,
      categoryImages: { ...current.categoryImages, [key]: value },
    }));
    markDirty("site");
  };

  const updatePhoneSetting = (key: "salesPhone" | "customerServicePhone" | "generalWhatsapp", value: string) => {
    updateSetting(key, sanitizePhoneNumber(value));
  };

  const updateWorkTime = (key: "workStartTime" | "workEndTime", value: string) => {
    setSettings((current) => {
      const next = { ...current, [key]: normalizeBusinessTime(value, current[key]) };
      return { ...next, workHours: formatArabicBusinessHours(next.workStartTime, next.workEndTime) };
    });
    markDirty("site");
  };

  const toggleBusinessDay = (day: string) => {
    setSettings((current) => {
      const days = new Set(current.workWeekdays.split(",").filter(Boolean));
      if (days.has(day)) days.delete(day);
      else days.add(day);
      const workWeekdays = businessWeekdays.map((item) => item.id).filter((id) => id !== "fri" && days.has(id)).join(",");
      return { ...current, workWeekdays };
    });
    markDirty("site");
  };

  const updateProductForm = (patch: Partial<StoredProduct>) => {
    setProductForm((current) => ({ ...current, ...patch }));
    markDirty("product-form");
  };

  const updateProductSection = (category: string) => {
    setProductForm((current) => ({
      ...current,
      category,
      printerCategory: category === "printers" ? current.printerCategory : undefined,
      specifications: category === "printers" ? current.specifications : undefined,
      printerPageContent: category === "printers" ? current.printerPageContent ?? createEmptyPrinterPageContent() : undefined,
      paperSpecifications: category === "papers" ? current.paperSpecifications : undefined,
      inkSpecifications: category === "inks" ? current.inkSpecifications : undefined,
      images: category === "inks" ? current.images : undefined,
    }));
    setPrinterCategoryError("");
    markDirty("product-form");
  };

  const updatePrinterCategory = (value: string) => {
    const printerCategory = isPrinterCategory(value) ? value : undefined;
    setProductForm((current) => ({
      ...current,
      printerCategory,
      family: !current.family || PRINTER_FAMILY_OPTIONS.includes(current.family as typeof PRINTER_FAMILY_OPTIONS[number])
        ? suggestPrinterFamily(printerCategory)
        : current.family,
    }));
    markDirty("product-form");
    setPrinterCategoryError("");
  };

  const updateProductFeatures = (value: string) => {
    setFeaturesText(value);
    markDirty("product-form");
  };

  const updateHeroForm = (patch: Partial<HeroSlide>) => {
    setHeroForm((current) => ({ ...current, ...patch }));
    markDirty("hero-form");
  };

  const updateHeroSettings = (patch: Partial<HeroSettings>) => {
    setHeroSettings((current) => ({ ...current, ...patch }));
    markDirty("hero-settings");
  };

  const markUploadsSaved = (activeUrls: Set<string>) => {
    for (const url of pendingUploadedMedia.current) {
      if (activeUrls.has(url)) pendingUploadedMedia.current.delete(url);
    }
  };

  const confirmAdminNavigation = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (hasUnsavedChanges && !window.confirm(UNSAVED_CHANGES_MESSAGE)) event.preventDefault();
  };
  const confirmAdminLogout = (event: FormEvent<HTMLFormElement>) => {
    if (hasUnsavedChanges && !window.confirm(UNSAVED_CHANGES_MESSAGE)) event.preventDefault();
  };

  const queueMediaRemoval = (url: string) => {
    const normalizedUrl = normalizeMediaUrl(url);
    if (normalizedUrl.startsWith(MEDIA_PROXY_PATH_PREFIX) || url.startsWith("https://")) {
      pendingMediaDeletes.current.add(normalizedUrl);
    }
  };

  const activeMediaUrls = (nextSettings = settings, nextProducts = products, nextHeroSlides = heroSlides) => new Set([
    normalizeMediaUrl(nextSettings.logoImage),
    normalizeMediaUrl(nextSettings.featureImage),
    ...Object.values(nextSettings.categoryImages).map((url) => normalizeMediaUrl(url)),
    ...nextProducts.map((product) => normalizeMediaUrl(product.image)),
    ...nextProducts.flatMap((product) => product.category === "inks" ? (product.images ?? []).map((image) => normalizeMediaUrl(image)) : []),
    ...nextHeroSlides.map((slide) => normalizeMediaUrl(slide.imageUrl)),
  ].filter(Boolean));

  const flushPendingMediaDeletes = async (activeUrls: Set<string>) => {
    let failures = 0;
    for (const url of [...pendingMediaDeletes.current]) {
      if (activeUrls.has(url)) continue;
      try {
        const response = await fetch("/api/upload", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!response.ok) throw new Error("delete failed");
        pendingMediaDeletes.current.delete(url);
      } catch {
        failures += 1;
      }
    }
    return failures;
  };

  const moveProductInHomeOrder = (category: HomeProductCategory, productId: number, direction: -1 | 1) => {
    setProducts((current) => moveHomeProduct(current, category, productId, direction));
    markDirty("home-order");
  };

  const requestHomeOrderSave = async (currentProducts: StoredProduct[]) => {
    const response = await fetch("/api/admin/home-product-order", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orders: buildHomeProductOrder(currentProducts) }),
    });
    const data = await response.json() as { error?: string; products?: StoredProduct[] };
    if (!response.ok || !Array.isArray(data.products)) {
      throw new Error(data.error || "تعذر حفظ ترتيب الواجهة الرئيسية");
    }
    return normalizeAdminProducts(data.products);
  };

  const saveHomeOrder = async () => {
    setHomeOrderSaving(true);
    setStatus("جاري حفظ ترتيب الواجهة الرئيسية...");
    try {
      const savedProducts = await requestHomeOrderSave(products);
      setProducts(savedProducts);
      clearDirty("home-order");
      setStatus("تم حفظ ترتيب الواجهة الرئيسية ونشره بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ ترتيب الواجهة الرئيسية");
    } finally {
      setHomeOrderSaving(false);
    }
  };

  const uploadFile = async (
    selectedFile: File,
    folder: "logos" | "banners" | "products" | "general" = "general",
  ) => {
    if (!isSupportedImageMimeType(selectedFile.type)) {
      throw new Error("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو GIF");
    }
    setStatus(selectedFile.type === "image/gif" ? "جاري تجهيز الصورة..." : "جاري ضغط وتجهيز الصورة...");
    let file = selectedFile;
    try {
      file = await optimizeImageForUpload(selectedFile);
    } catch {
      file = selectedFile;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      throw new Error("حجم الصورة يجب ألا يتجاوز 4MB بعد المعالجة");
    }
    setStatus("جاري رفع الصورة...");
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json() as { error?: string; url?: string };
    if (!response.ok) throw new Error(data.error || "تعذر رفع الصورة");
    if (!data.url) throw new Error("لم يُرجع الخادم رابط الصورة");
    const uploadedUrl = normalizeMediaUrl(data.url);
    pendingUploadedMedia.current.add(uploadedUrl);
    return uploadedUrl;
  };

  const uploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    currentUrl: string,
    onUploaded: (url: string) => void,
    folder: "logos" | "banners" | "products" | "general" = "general",
  ) => {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0];
    if (!selectedFile) return;
    setUploadingImage(true);
    try {
      const uploadedUrl = await uploadFile(selectedFile, folder);
      if (currentUrl && normalizeMediaUrl(currentUrl) !== uploadedUrl) queueMediaRemoval(currentUrl);
      onUploaded(uploadedUrl);
      setStatus("تم رفع الصورة، اضغط حفظ جميع التعديلات");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر رفع الصورة");
    }
    setUploadingImage(false);
    input.value = "";
  };

  const uploadInkImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = [...(input.files ?? [])];
    if (!files.length) return;
    setUploadingImage(true);
    try {
      for (const file of files) {
        const uploadedUrl = await uploadFile(file, "products");
        setProductForm((current) => {
          const images = [...new Set([...(current.images?.length ? current.images : current.image ? [current.image] : []), uploadedUrl])];
          return {
            ...current,
            image: images[0] ?? "",
            images,
            inkSpecifications: { ...(current.inkSpecifications ?? createEmptyInkSpecifications()), images },
          };
        });
      }
      markDirty("product-form");
      setStatus("تم رفع صور الحبر، اضغط حفظ المنتج");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر رفع صور الحبر");
    }
    setUploadingImage(false);
    input.value = "";
  };

  const removeImage = (url: string, onRemoved: () => void) => {
    if (!url || !window.confirm("هل تريد إزالة هذه الصورة؟")) return;
    queueMediaRemoval(url);
    onRemoved();
    setStatus("تم تجهيز حذف الصورة، اضغط حفظ لتأكيد التعديل");
  };

  const saveAll = async () => {
    setSaving(true);
    setStatus("جاري حفظ ونشر التعديلات...");
    try {
      const response = await fetch("/api/site", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر الحفظ");
      const savedProducts = dirtyScopes.includes("home-order")
        ? await requestHomeOrderSave(products)
        : products;
      if (savedProducts !== products) setProducts(savedProducts);
      const savedUrls = activeMediaUrls(settings, savedProducts, heroSlides);
      markUploadsSaved(savedUrls);
      const deleteFailures = await flushPendingMediaDeletes(savedUrls);
      clearDirty("site");
      clearDirty("home-order");
      setStatus(deleteFailures
        ? "تم حفظ التعديلات، لكن تعذر تنظيف بعض الصور القديمة"
        : "تم حفظ التعديلات ونشرها بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const saveProductDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (productForm.category === "printers" && !isPrinterCategory(productForm.printerCategory)) {
      const message = "يرجى اختيار فئة الطابعة قبل إضافة المنتج.";
      setPrinterCategoryError(message);
      setStatus(message);
      return;
    }
    if (productForm.description.length > 160) {
      setStatus("الوصف يتجاوز الحد الأقصى المسموح وهو 160 حرفاً.");
      return;
    }
    if (productForm.category === "inks") {
      const inkNameError = getInkProductNameError(productForm.name, productForm.inkSpecifications?.capacities ?? []);
      if (inkNameError) {
        setStatus(inkNameError);
        return;
      }
    }
    const inkImages = productForm.category === "inks"
      ? productForm.images?.length ? productForm.images : productForm.image ? [productForm.image] : []
      : undefined;
    const next = {
      ...productForm,
      id: editingId ?? Date.now(),
      image: inkImages?.[0] ?? productForm.image,
      images: inkImages,
      inkSpecifications: productForm.category === "inks" && productForm.inkSpecifications
        ? { ...productForm.inkSpecifications, images: inkImages ?? [] }
        : productForm.inkSpecifications,
      features: featuresText.split(",").map((item) => item.trim()).filter(Boolean),
    };
    setSaving(true);
    setStatus(editingId ? "جاري حفظ المنتج..." : "جاري إضافة المنتج...");
    try {
      const response = await fetch("/api/site", {
        method: editingId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: next }),
      });
      const data = await response.json() as { error?: string; product?: StoredProduct };
      if (!response.ok || !data.product) {
        throw new Error(data.error || (editingId ? "تعذر حفظ المنتج" : "تعذر إضافة المنتج"));
      }
      const nextProducts = editingId
        ? replaceProductById(products, data.product)
        : addProductToCollection(products, data.product);
      setProducts(nextProducts);
      const savedUrls = activeMediaUrls(settings, nextProducts, heroSlides);
      markUploadsSaved(savedUrls);
      const deleteFailures = await flushPendingMediaDeletes(savedUrls);
      setStatus(deleteFailures
        ? "تم حفظ المنتج، لكن تعذر تنظيف بعض الصور القديمة"
        : editingId ? "تم حفظ المنتج بنجاح ✓" : "تمت إضافة المنتج بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : editingId ? "تعذر حفظ المنتج" : "تعذر إضافة المنتج");
      setSaving(false);
      return;
    }
    setSaving(false);
    setProductForm(emptyProduct);
    setFeaturesText("");
    setPriceMode("quote");
    setPrinterCategoryError("");
    setEditingId(null);
    clearDirty("product-form");
  };

  const saveHeroSlide = async (event: FormEvent) => {
    event.preventDefault();
    setHeroSaving(true);
    setStatus(editingHeroId ? "جاري حفظ تعديل الشريحة..." : "جاري إضافة الشريحة...");
    try {
      const response = await fetch(editingHeroId ? `/api/admin/hero-slides/${editingHeroId}` : "/api/admin/hero-slides", {
        method: editingHeroId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(heroForm),
      });
      const data = await response.json() as { error?: string; slide?: HeroSlide };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الشريحة");
      if (!data.slide) throw new Error("لم يُرجع الخادم بيانات الشريحة");
      const savedSlide = { ...data.slide, imageUrl: normalizeMediaUrl(data.slide.imageUrl) };
      const nextSlides = (editingHeroId
        ? heroSlides.map((slide) => slide.id === editingHeroId ? savedSlide : slide)
        : [...heroSlides, savedSlide]
      ).sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
      setHeroSlides(nextSlides);
      setHeroForm(emptyHeroSlide);
      setEditingHeroId(null);
      const savedUrls = activeMediaUrls(settings, products, nextSlides);
      markUploadsSaved(savedUrls);
      const deleteFailures = await flushPendingMediaDeletes(savedUrls);
      clearDirty("hero-form");
      setStatus(deleteFailures ? "تم حفظ الشريحة، لكن تعذر تنظيف الصورة القديمة" : "تم حفظ الشريحة بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ الشريحة");
    } finally {
      setHeroSaving(false);
    }
  };

  const editHeroSlide = (slide: HeroSlide) => {
    setEditingHeroId(slide.id);
    setHeroForm(slide);
    clearDirty("hero-form");
    setActiveTab("hero");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteHeroSlide = async (slide: HeroSlide) => {
    if (!window.confirm(`هل تريد حذف الشريحة "${slide.title}"؟`)) return;
    setStatus("جاري حذف الشريحة...");
    try {
      const response = await fetch(`/api/admin/hero-slides/${slide.id}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حذف الشريحة");
      const nextSlides = heroSlides.filter((item) => item.id !== slide.id);
      setHeroSlides(nextSlides);
      queueMediaRemoval(slide.imageUrl);
      if (editingHeroId === slide.id) {
        setEditingHeroId(null);
        setHeroForm(emptyHeroSlide);
        clearDirty("hero-form");
      }
      const deleteFailures = await flushPendingMediaDeletes(activeMediaUrls(settings, products, nextSlides));
      setStatus(deleteFailures ? "تم حذف الشريحة، لكن تعذر حذف صورتها" : "تم حذف الشريحة بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حذف الشريحة");
    }
  };

  const saveHeroSettings = async () => {
    setHeroSaving(true);
    setStatus("جاري حفظ إعدادات حركة البانر...");
    try {
      const response = await fetch("/api/admin/hero-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(heroSettings),
      });
      const data = await response.json() as { error?: string; settings?: Partial<HeroSettings> };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ إعدادات البانر");
      setHeroSettings({ ...defaultHeroSettings, ...data.settings });
      clearDirty("hero-settings");
      setStatus("تم حفظ إعدادات البانر بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ إعدادات البانر");
    } finally {
      setHeroSaving(false);
    }
  };

  const editProduct = (product: StoredProduct) => {
    const printerCategory = product.category === "printers"
      ? resolvePrinterCategory(product.printerCategory, product.name)
      : undefined;
    setEditingId(product.id);
    setProductForm({
      ...product,
      printerCategory,
    });
    setFeaturesText(product.features.join(", "));
    setPriceMode(product.price ? "fixed" : "quote");
    setPrinterCategoryError("");
    clearDirty("product-form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (product: StoredProduct) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    setSaving(true);
    setStatus("جاري حذف المنتج...");
    try {
      const response = await fetch("/api/site", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر حذف المنتج");
      const nextProducts = removeProductById(products, product.id);
      setProducts(nextProducts);
      (product.category === "inks" && product.images?.length ? product.images : [product.image]).forEach(queueMediaRemoval);
      const activeUrls = activeMediaUrls(settings, nextProducts, heroSlides);
      const deleteFailures = await flushPendingMediaDeletes(activeUrls);
      setStatus(deleteFailures
        ? "تم حذف المنتج، لكن تعذر تنظيف صورته"
        : "تم حذف المنتج بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حذف المنتج");
    } finally {
      setSaving(false);
    }
  };

  return <main id="main-content" tabIndex={-1} dir="rtl" className="real-admin-page">
    <header className="real-admin-header"><div><span>لوحة إدارة الموقع</span><h1>إدارة موقع وكالة إسحاق العالمية</h1><p>مرحبًا، {userName}</p></div><div className="real-admin-header-actions"><Link href="/" onClick={confirmAdminNavigation}>عرض الموقع</Link><form action={signOutPath} method="post" onSubmit={confirmAdminLogout}><button type="submit">تسجيل الخروج</button></form></div></header>
    <div className="real-admin-toolbar"><nav aria-label="أقسام لوحة التحكم">
      <button className={activeTab === "page" ? "active" : ""} onClick={() => setActiveTab("page")}>بيانات الصفحة</button>
      <button className={activeTab === "ads" ? "active" : ""} onClick={() => setActiveTab("ads")}>الإعلانات والصور</button>
      <button className={activeTab === "category-images" ? "active" : ""} onClick={() => setActiveTab("category-images")}>صور الفئات</button>
      <button className={activeTab === "hero" ? "active" : ""} onClick={() => setActiveTab("hero")}>إدارة البانر المتحرك</button>
      <button className={activeTab === "home-order" ? "active" : ""} onClick={() => setActiveTab("home-order")}>ترتيب الواجهة الرئيسية</button>
      <button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>المنتجات</button>
    </nav><button className="save-all-button" onClick={saveAll} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ جميع التعديلات"}</button></div>
    <p className="admin-live-status" role="status" aria-busy={uploadingImage}>{uploadingImage && <span className="upload-spinner" aria-hidden="true"></span>}{status}</p>

    {activeTab === "page" && <section className="real-admin-grid">
      <div className="real-admin-card"><h2>بيانات التواصل</h2>
        <label>العنوان<input value={settings.address} onChange={(e) => updateSetting("address", e.target.value)} /></label>
        <label>رقم المبيعات<input dir="ltr" inputMode="numeric" pattern="[0-9]*" value={settings.salesPhone} onChange={(e) => updatePhoneSetting("salesPhone", e.target.value)} /></label>
        <label>رقم خدمة العملاء<input dir="ltr" inputMode="numeric" pattern="[0-9]*" value={settings.customerServicePhone} onChange={(e) => updatePhoneSetting("customerServicePhone", e.target.value)} /></label>
        <label>واتساب العام<input dir="ltr" inputMode="numeric" pattern="[0-9]*" value={settings.generalWhatsapp} onChange={(e) => updatePhoneSetting("generalWhatsapp", e.target.value)} /></label>
      </div>
      <div className="real-admin-card"><h2>أوقات العمل</h2>
        <label>أيام العمل<input value={settings.workDays} onChange={(e) => updateSetting("workDays", e.target.value)} /></label>
        <div className="admin-workdays"><span>الأيام التي يظهر فيها المعرض مفتوحًا (الجمعة مغلق)</span>{businessWeekdays.filter((day) => day.id !== "fri").map((day) => <label className="admin-check" key={day.id}><input type="checkbox" checked={settings.workWeekdays.split(",").includes(day.id)} onChange={() => toggleBusinessDay(day.id)} /> {day.label}</label>)}</div>
        <div className="admin-two-columns"><label>بداية الدوام<input type="time" value={settings.workStartTime} onChange={(e) => updateWorkTime("workStartTime", e.target.value)} /></label><label>نهاية الدوام<input type="time" value={settings.workEndTime} onChange={(e) => updateWorkTime("workEndTime", e.target.value)} /></label></div>
        <label>ساعات العمل المعروضة<input value={settings.workHours} readOnly /></label>
      </div>
      <div className="real-admin-card"><h2>قسم الصيانة</h2>
        <label>العنوان<input value={settings.maintenanceTitle} onChange={(e) => updateSetting("maintenanceTitle", e.target.value)} /></label>
        <label>الوصف<textarea value={settings.maintenanceDescription} onChange={(e) => updateSetting("maintenanceDescription", e.target.value)} /></label>
      </div>
      <div className="real-admin-card"><h2>بانر التواصل</h2>
        <label>النص الصغير<input value={settings.contactKicker} onChange={(e) => updateSetting("contactKicker", e.target.value)} /></label>
        <label>العنوان<input value={settings.contactTitle} onChange={(e) => updateSetting("contactTitle", e.target.value)} /></label>
      </div>
      <div className="real-admin-card purchase-benefits-editor">
        <h2>لماذا تشتري من مجموعة إسحاق العالمية؟</h2>
        <label>العنوان<input value={settings.productPurchaseBenefits.title} onChange={(event) => updatePurchaseBenefits({ title: event.target.value })} /></label>
        <label>وصف عام<textarea rows={5} value={settings.productPurchaseBenefits.description} onChange={(event) => updatePurchaseBenefits({ description: event.target.value })} /></label>
        <div className="admin-dynamic-list">
          <div className="admin-dynamic-list-head"><b>العناصر</b><button type="button" onClick={() => updatePurchaseBenefits({ items: [...settings.productPurchaseBenefits.items, { title: "", description: "" }] })}>إضافة عنصر</button></div>
          {settings.productPurchaseBenefits.items.map((item, index) => <div className="admin-dynamic-item" key={index}>
            <label>عنوان العنصر<input value={item.title} onChange={(event) => updatePurchaseBenefits({ items: settings.productPurchaseBenefits.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, title: event.target.value } : entry) })} /></label>
            <label>الشرح<textarea rows={4} value={item.description} onChange={(event) => updatePurchaseBenefits({ items: settings.productPurchaseBenefits.items.map((entry, itemIndex) => itemIndex === index ? { ...entry, description: event.target.value } : entry) })} /></label>
            <button className="admin-remove-item" type="button" onClick={() => updatePurchaseBenefits({ items: settings.productPurchaseBenefits.items.filter((_, itemIndex) => itemIndex !== index) })}>حذف العنصر</button>
          </div>)}
        </div>
      </div>
    </section>}

    {activeTab === "ads" && <section className="real-admin-grid">
      <ImageEditor title="شعار الموقع" value={settings.logoImage} onUpload={(event) => uploadImage(event, settings.logoImage, (url) => updateSetting("logoImage", url), "logos")} onRemove={() => removeImage(settings.logoImage, () => updateSetting("logoImage", ""))} />
      <div className="real-admin-card hero-management-note"><h2>الإعلان الرئيسي</h2><p>يمكن تعديل الإعلان الرئيسي وشرائح العرض من قسم إدارة البانر المتحرك</p><button type="button" onClick={() => setActiveTab("hero")}>الانتقال إلى إدارة البانر المتحرك</button></div>
      <div className="real-admin-card"><h2>البانر الدعائي الثاني</h2>
        <label>النص العلوي<input value={settings.featureEyebrow} onChange={(e) => updateSetting("featureEyebrow", e.target.value)} /></label>
        <label>العنوان<input value={settings.featureTitle} onChange={(e) => updateSetting("featureTitle", e.target.value)} /></label>
        <label>الوصف<textarea value={settings.featureDescription} onChange={(e) => updateSetting("featureDescription", e.target.value)} /></label>
        <ImageField value={settings.featureImage} onUpload={(event) => uploadImage(event, settings.featureImage, (url) => updateSetting("featureImage", url), "banners")} onRemove={() => removeImage(settings.featureImage, () => updateSetting("featureImage", ""))} />
      </div>
    </section>}

    {activeTab === "category-images" && <section className="real-admin-card category-images-manager">
      <div className="category-images-heading">
        <div><h2>صور الفئات</h2><p>يمكن تخصيص صورة كل بطاقة فئة. عند ترك الصورة فارغة سيستخدم الموقع الصورة الاحتياطية الحالية.</p></div>
      </div>
      <div className="category-images-admin-grid">
        {categoryImageDefinitions.map(({ key, label }) => {
          const value = settings.categoryImages[key];
          return <article className="category-image-editor" key={key}>
            <h3>{label}</h3>
            <ImageField
              value={value}
              onUpload={(event) => uploadImage(event, value, (url) => updateCategoryImage(key, url), "general")}
              onRemove={() => removeImage(value, () => updateCategoryImage(key, ""))}
              label="صورة بطاقة الفئة"
              actionText={value ? "تغيير الصورة" : "رفع صورة"}
            />
          </article>;
        })}
      </div>
    </section>}

    {activeTab === "hero" && <section className="hero-admin-layout">
      <div className="real-admin-card hero-slides-manager">
        <div className="hero-admin-head"><h2>إدارة البانر المتحرك</h2><button type="button" onClick={() => { setEditingHeroId(null); setHeroForm({ ...emptyHeroSlide, displayOrder: heroSlides.length + 1 }); clearDirty("hero-form"); }}>إضافة شريحة جديدة</button></div>
        <div className="hero-slides-table" role="table" aria-label="جدول شرائح البانر">
          <div className="hero-slides-row hero-slides-header" role="row"><span>الصورة</span><span>العنوان</span><span>الحالة</span><span>الترتيب</span><span>تعديل</span><span>حذف</span></div>
          {heroSlides.map((slide) => <div className="hero-slides-row" role="row" key={slide.id}>
            <span><img src={normalizeMediaUrl(slide.imageUrl) || "/brand/eshak-logo.png"} alt={slide.imageAlt || slide.title} /></span>
            <b>{slide.title}</b>
            <span className={slide.isActive ? "hero-state active" : "hero-state"}>{slide.isActive ? "ظاهرة" : "مخفية"}</span>
            <span>{slide.displayOrder}</span>
            <button type="button" onClick={() => editHeroSlide(slide)}>تعديل</button>
            <button type="button" className="delete-product" onClick={() => deleteHeroSlide(slide)}>حذف</button>
          </div>)}
          {!heroSlides.length && <p className="hero-empty">لا توجد شرائح حاليًا.</p>}
        </div>
      </div>

      <form className="real-admin-card hero-slide-form" onSubmit={saveHeroSlide}>
        <h2>{editingHeroId ? "تعديل شريحة" : "إضافة شريحة جديدة"}</h2>
        <label>العنوان<input required value={heroForm.title} onChange={(e) => updateHeroForm({ title: e.target.value })} /></label>
        <label>العنوان الفرعي<input value={heroForm.subtitle} onChange={(e) => updateHeroForm({ subtitle: e.target.value })} /></label>
        <label>الوصف<textarea required value={heroForm.description} onChange={(e) => updateHeroForm({ description: e.target.value })} /></label>
        <label>النص الصغير<input value={heroForm.badgeText} onChange={(e) => updateHeroForm({ badgeText: e.target.value })} /></label>
        <ImageField value={heroForm.imageUrl} onUpload={(event) => uploadImage(event, heroForm.imageUrl, (url) => updateHeroForm({ imageUrl: url }), "banners")} onRemove={() => removeImage(heroForm.imageUrl, () => updateHeroForm({ imageUrl: "" }))} label="الصورة" actionText={heroForm.imageUrl ? "استبدال الصورة" : "اختيار صورة"} />
        <label>وصف الصورة<input value={heroForm.imageAlt} onChange={(e) => updateHeroForm({ imageAlt: e.target.value })} /></label>
        <div className="admin-two-columns"><label>نص الزر الأول<input value={heroForm.primaryButtonText} onChange={(e) => updateHeroForm({ primaryButtonText: e.target.value })} /></label><label>رابط الزر الأول<input dir="ltr" value={heroForm.primaryButtonUrl} onChange={(e) => updateHeroForm({ primaryButtonUrl: e.target.value })} /></label></div>
        <div className="admin-two-columns"><label>نص الزر الثاني<input value={heroForm.secondaryButtonText} onChange={(e) => updateHeroForm({ secondaryButtonText: e.target.value })} /></label><label>رابط الزر الثاني<input dir="ltr" value={heroForm.secondaryButtonUrl} onChange={(e) => updateHeroForm({ secondaryButtonUrl: e.target.value })} /></label></div>
        <div className="admin-two-columns"><label>ترتيب الشريحة<input type="number" value={heroForm.displayOrder} onChange={(e) => updateHeroForm({ displayOrder: Number(e.target.value) })} /></label><label>حالة الشريحة<select value={heroForm.isActive ? "visible" : "hidden"} onChange={(e) => updateHeroForm({ isActive: e.target.value === "visible" })}><option value="visible">ظاهرة</option><option value="hidden">مخفية</option></select></label></div>
        <div className="product-editor-actions"><button type="submit" disabled={heroSaving}>{heroSaving ? "جاري الحفظ..." : editingHeroId ? "حفظ التعديل" : "إضافة الشريحة"}</button><button type="button" onClick={() => { setEditingHeroId(null); setHeroForm(emptyHeroSlide); clearDirty("hero-form"); }}>تفريغ</button></div>
      </form>

      <div className="real-admin-card hero-settings-card">
        <h2>إعدادات الحركة</h2>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.autoplayEnabled} onChange={(e) => updateHeroSettings({ autoplayEnabled: e.target.checked })} /> تشغيل الحركة التلقائية</label>
        <label>سرعة الانتقال بالثواني<input type="number" min="1" max="30" value={Math.round(heroSettings.autoplayDelay / 1000)} onChange={(e) => updateHeroSettings({ autoplayDelay: Math.max(1, Number(e.target.value)) * 1000 })} /></label>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.showArrows} onChange={(e) => updateHeroSettings({ showArrows: e.target.checked })} /> إظهار الأسهم</label>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.showDots} onChange={(e) => updateHeroSettings({ showDots: e.target.checked })} /> إظهار النقاط</label>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.pauseOnHover} onChange={(e) => updateHeroSettings({ pauseOnHover: e.target.checked })} /> التوقف عند مرور الماوس</label>
        <button className="save-all-button" type="button" onClick={saveHeroSettings} disabled={heroSaving}>{heroSaving ? "جاري الحفظ..." : "حفظ إعدادات البانر"}</button>
      </div>
    </section>}

    {activeTab === "home-order" && <section className="real-admin-card home-order-manager" aria-labelledby="home-order-title">
      <div className="home-order-heading"><div><h2 id="home-order-title">ترتيب الواجهة الرئيسية</h2><p>رتّب منتجات كل قسم بشكل مستقل باستخدام السهمين، ثم احفظ لنشر الترتيب في الصفحة الرئيسية فقط.</p></div><button type="button" onClick={saveHomeOrder} disabled={homeOrderSaving || !dirtyScopes.includes("home-order")}>{homeOrderSaving ? "جاري الحفظ..." : "حفظ ترتيب الواجهة الرئيسية"}</button></div>
      <div className="home-order-categories">{HOME_PRODUCT_CATEGORIES.map((category) => {
        const categoryProducts = homeProductsForCategory(products, category);
        return <article className="home-order-category" key={category} data-category={category}>
          <header><div><h3>{homeOrderCategoryLabels[category]}</h3><span>{categoryProducts.length} منتج</span></div><small>ترتيب مستقل</small></header>
          {categoryProducts.length ? <ol>{categoryProducts.map((product, index) => <li key={product.id}>
            <span className="home-order-position" aria-label={`الترتيب ${index + 1}`}>{index + 1}</span>
            <img src={normalizeMediaUrl(product.image) || "/brand/eshak-logo.png"} alt="" />
            <b>{product.name}</b>
            <div className="home-order-actions">
              <button type="button" onClick={() => moveProductInHomeOrder(category, product.id, -1)} disabled={index === 0} aria-label={`نقل ${product.name} لأعلى`}>↑</button>
              <button type="button" onClick={() => moveProductInHomeOrder(category, product.id, 1)} disabled={index === categoryProducts.length - 1} aria-label={`نقل ${product.name} لأسفل`}>↓</button>
            </div>
          </li>)}</ol> : <p className="home-order-empty">لا توجد منتجات في هذا القسم حاليًا.</p>}
        </article>;
      })}</div>
    </section>}

    {activeTab === "products" && <>
      <section className="product-admin-layout">
      <form className="real-admin-card product-editor" onSubmit={saveProductDraft}><h2>{editingId ? "تعديل المنتج" : "إضافة منتج"}</h2>
        <label>القسم<select value={productForm.category} onChange={(e) => updateProductSection(e.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {productForm.category === "printers" && <label>الفئة<select
          value={productForm.printerCategory ?? ""}
          required
          aria-invalid={Boolean(printerCategoryError)}
          aria-describedby={printerCategoryError ? "printer-category-error" : undefined}
          onInvalid={(event) => {
            event.currentTarget.setCustomValidity("يرجى اختيار فئة الطابعة قبل إضافة المنتج.");
            setPrinterCategoryError("يرجى اختيار فئة الطابعة قبل إضافة المنتج.");
          }}
          onChange={(event) => {
            event.currentTarget.setCustomValidity("");
            updatePrinterCategory(event.target.value);
          }}
        >
          <option value="">اختر فئة الطابعة</option>
          {PRINTER_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>{printerCategoryError && <span className="admin-field-error" id="printer-category-error" role="alert">{printerCategoryError}</span>}</label>}
        {productForm.category !== "papers" && <label>اسم المنتج<input required value={productForm.name} aria-invalid={productForm.category === "inks" && Boolean(getInkProductNameError(productForm.name, productForm.inkSpecifications?.capacities ?? []))} onChange={(e) => updateProductForm({ name: e.target.value })} />{productForm.category === "inks" && <><small>الصيغة المعتمدة: حبر + الاسم الفني + جميع السعات، مثل: حبر Pigment 500 مل / 1000 ML</small>{getInkProductNameError(productForm.name, productForm.inkSpecifications?.capacities ?? []) && <span className="admin-field-error" role="alert">{getInkProductNameError(productForm.name, productForm.inkSpecifications?.capacities ?? [])}</span>}</>}</label>}
        {productForm.category !== "papers" && productForm.category !== "inks" && <><label>السلسلة أو العائلة<input list="printer-family-options" value={productForm.family} onChange={(e) => updateProductForm({ family: e.target.value })} placeholder="اختر اقتراحاً أو اكتب عائلة أخرى" /></label>
        <datalist id="printer-family-options">{PRINTER_FAMILY_OPTIONS.map((family) => <option key={family} value={family} />)}</datalist></>}
        {productForm.category === "printers" && <PrinterSpecificationsEditor product={productForm} onChange={updateProductForm} />}
        {productForm.category === "printers" && <PrinterPageContentEditor product={productForm} onChange={updateProductForm} />}
        {productForm.category === "papers" && <PaperSpecificationsEditor product={productForm} onChange={updateProductForm} />}
        {productForm.category === "inks" && <InkSpecificationsEditor product={productForm} printers={products.filter((product) => product.category === "printers")} onChange={updateProductForm} />}
        <div className="admin-two-columns">{productForm.category !== "inks" && <label>الشارة<select value={productForm.badge ?? ""} onChange={(e) => updateProductForm({ badge: e.target.value })}>{productForm.badge && !PRODUCT_BADGE_OPTIONS.includes(productForm.badge as typeof PRODUCT_BADGE_OPTIONS[number]) && <option value={productForm.badge}>{productForm.badge} (قيمة حالية)</option>}{PRODUCT_BADGE_OPTIONS.map((badge) => <option key={badge || "none"} value={badge}>{badge || "بدون شارة"}</option>)}</select></label>}<label>نمط السعر<select value={priceMode} onChange={(event) => {
          const mode = event.target.value as PriceMode;
          setPriceMode(mode);
          if (mode === "quote") updateProductForm({ price: "" });
          else markDirty("product-form");
        }}>{PRICE_MODE_OPTIONS.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label></div>
        {priceMode === "fixed" && <label>السعر المحدد<input value={productForm.price ?? ""} onChange={(e) => updateProductForm({ price: e.target.value })} placeholder="أدخل السعر كما سيظهر للزبون" /></label>}
        <label>الوصف القصير<textarea value={productForm.description} aria-invalid={productForm.description.length > 160} onChange={(e) => updateProductForm({ description: e.target.value })} /><span className={productForm.description.length > 160 ? "description-counter over-limit" : "description-counter"}>{productForm.description.length} / 160 حرفاً</span>{productForm.description.length > 160 && <span className="admin-field-error" role="alert">الوصف يتجاوز الحد الأقصى المسموح وهو 160 حرفاً.</span>}</label>
        {productForm.category !== "inks" && <label>المميزات القديمة، افصل بفاصلة <small>للتوافق مع المنتجات الحالية فقط</small><input value={featuresText} onChange={(e) => updateProductFeatures(e.target.value)} /></label>}
        {productForm.category === "inks"
          ? <InkImagesEditor
              images={productForm.images?.length ? productForm.images : productForm.image ? [productForm.image] : []}
              uploading={uploadingImage}
              onUpload={uploadInkImages}
              onChange={(images, removedImage) => {
                if (removedImage) queueMediaRemoval(removedImage);
                updateProductForm({
                  image: images[0] ?? "",
                  images,
                  inkSpecifications: { ...(productForm.inkSpecifications ?? createEmptyInkSpecifications()), images },
                });
              }}
            />
          : <ImageField value={productForm.image} onUpload={(event) => uploadImage(event, productForm.image, (url) => updateProductForm({ image: url }), "products")} onRemove={() => removeImage(productForm.image, () => updateProductForm({ image: "" }))} />}
        <div className="product-editor-actions"><button type="submit" disabled={saving}>{saving ? "جاري الحفظ..." : editingId ? "حفظ التعديل" : "إضافة المنتج"}</button><button type="button" onClick={() => { setEditingId(null); setProductForm(emptyProduct); setFeaturesText(""); setPriceMode("quote"); setPrinterCategoryError(""); clearDirty("product-form"); }}>تفريغ</button></div>
      </form>
      <div className="real-admin-card products-manager"><h2>المنتجات الحالية ({products.length})</h2>{products.map((product) => <article key={product.id}><img src={normalizeMediaUrl(product.image) || "/brand/eshak-logo.png"} alt="" /><div><b>{product.name}</b><span>{categories.find(([value]) => value === product.category)?.[1]}{product.category === "printers" && getPrinterCategoryLabel(product.printerCategory) ? ` — ${getPrinterCategoryLabel(product.printerCategory)}` : ""}</span></div><button type="button" onClick={() => editProduct(product)}>تعديل</button><button type="button" className="delete-product" onClick={() => deleteProduct(product)}>حذف</button></article>)}</div>
      </section>
    </>}
  </main>;
}

function PrinterPageContentEditor({ product, onChange }: { product: StoredProduct; onChange: (patch: Partial<StoredProduct>) => void }) {
  const content = product.printerPageContent ?? createEmptyPrinterPageContent();
  const updateContent = (patch: Partial<PrinterPageContent>) => onChange({
    printerPageContent: { ...content, ...patch },
  });

  const updateItem = (
    field: "productFeatures" | "productUses",
    index: number,
    patch: Partial<{ title: string; description: string }>,
  ) => updateContent({
    [field]: content[field].map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });

  const removeItem = (field: "productFeatures" | "productUses", index: number) => updateContent({
    [field]: content[field].filter((_, itemIndex) => itemIndex !== index),
  });

  return <fieldset className="admin-content-editor">
    <legend>محتوى صفحة تفاصيل أكثر</legend>
    <label>الوصف التفصيلي<textarea rows={7} value={content.detailedDescription} onChange={(event) => updateContent({ detailedDescription: event.target.value })} /></label>
    <AdminContentList
      title="مميزات المنتج"
      items={content.productFeatures}
      titleLabel="عنوان الميزة"
      descriptionLabel="الشرح"
      onAdd={() => updateContent({ productFeatures: [...content.productFeatures, { title: "", description: "" }] })}
      onUpdate={(index, patch) => updateItem("productFeatures", index, patch)}
      onRemove={(index) => removeItem("productFeatures", index)}
    />
    <AdminContentList
      title="استخدامات المنتج"
      items={content.productUses}
      titleLabel="عنوان الاستخدام"
      descriptionLabel="الشرح"
      onAdd={() => updateContent({ productUses: [...content.productUses, { title: "", description: "" }] })}
      onUpdate={(index, patch) => updateItem("productUses", index, patch)}
      onRemove={(index) => removeItem("productUses", index)}
    />
    <label>لماذا تختار هذا المنتج؟<textarea rows={7} value={content.whyChooseThisProduct} onChange={(event) => updateContent({ whyChooseThisProduct: event.target.value })} /></label>
    <div className="admin-dynamic-list">
      <div className="admin-dynamic-list-head"><b>الأسئلة الشائعة</b><button type="button" onClick={() => updateContent({ faq: [...content.faq, { question: "", answer: "" }] })}>إضافة سؤال</button></div>
      {content.faq.map((item, index) => <div className="admin-dynamic-item" key={index}>
        <label>السؤال<input value={item.question} onChange={(event) => updateContent({ faq: content.faq.map((faq, faqIndex) => faqIndex === index ? { ...faq, question: event.target.value } : faq) })} /></label>
        <label>الإجابة<textarea rows={4} value={item.answer} onChange={(event) => updateContent({ faq: content.faq.map((faq, faqIndex) => faqIndex === index ? { ...faq, answer: event.target.value } : faq) })} /></label>
        <button className="admin-remove-item" type="button" onClick={() => updateContent({ faq: content.faq.filter((_, faqIndex) => faqIndex !== index) })}>حذف السؤال</button>
      </div>)}
    </div>
  </fieldset>;
}

function AdminContentList({
  title,
  items,
  titleLabel,
  descriptionLabel,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  items: Array<{ title: string; description: string }>;
  titleLabel: string;
  descriptionLabel: string;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<{ title: string; description: string }>) => void;
  onRemove: (index: number) => void;
}) {
  return <div className="admin-dynamic-list">
    <div className="admin-dynamic-list-head"><b>{title}</b><button type="button" onClick={onAdd}>إضافة عنصر</button></div>
    {items.map((item, index) => <div className="admin-dynamic-item" key={index}>
      <label>{titleLabel}<input value={item.title} onChange={(event) => onUpdate(index, { title: event.target.value })} /></label>
      <label>{descriptionLabel}<textarea rows={4} value={item.description} onChange={(event) => onUpdate(index, { description: event.target.value })} /></label>
      <button className="admin-remove-item" type="button" onClick={() => onRemove(index)}>حذف العنصر</button>
    </div>)}
  </div>;
}

function InkSpecificationsEditor({
  product,
  printers,
  onChange,
}: {
  product: StoredProduct;
  printers: StoredProduct[];
  onChange: (patch: Partial<StoredProduct>) => void;
}) {
  const specifications = product.inkSpecifications ?? createEmptyInkSpecifications();
  const [customCapacity, setCustomCapacity] = useState("");
  const [customPrinter, setCustomPrinter] = useState("");
  const update = (patch: Partial<InkSpecifications>) => onChange({ inkSpecifications: { ...specifications, ...patch } });
  const toggle = (field: "capacities" | "compatiblePrinters", value: string) => {
    const values = specifications[field];
    update({ [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] });
  };
  const addCustom = (field: "capacities" | "compatiblePrinters", value: string, clear: () => void) => {
    const clean = value.trim();
    if (!clean || specifications[field].includes(clean)) return;
    update({ [field]: [...specifications[field], clean] });
    clear();
  };
  const updateListItem = (field: "features" | "uses", index: number, value: string) => update({
    [field]: specifications[field].map((item, itemIndex) => itemIndex === index ? value : item),
  });

  return <fieldset className="printer-specifications-editor">
    <legend>مواصفات الأحبار المنظمة</legend>
    <div className="admin-two-columns">
      <label>العلامة التجارية<input value={specifications.brand ?? ""} onChange={(event) => update({ brand: event.target.value || null })} /></label>
      <label>نوع الحبر<select value={specifications.inkType ?? ""} onChange={(event) => update({ inkType: event.target.value || null })}><option value="">غير محدد</option>{PRODUCT_INK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>عدد الألوان<select value={specifications.colorCount ?? ""} onChange={(event) => update({ colorCount: event.target.value as InkSpecifications["colorCount"] || null })}><option value="">غير محدد</option>{INK_COLOR_COUNT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    </div>
    <div className="admin-option-group"><span>السعات المتوفرة</span><div className="admin-options-grid">{INK_CAPACITY_OPTIONS.map((option) => <label className="admin-check" key={option}><input type="checkbox" checked={specifications.capacities.includes(option)} onChange={() => toggle("capacities", option)} /> {option}</label>)}</div></div>
    <div className="admin-two-columns"><label>سعة أخرى<input value={customCapacity} onChange={(event) => setCustomCapacity(event.target.value)} placeholder="مثال: 250 مل" /></label><button type="button" onClick={() => addCustom("capacities", customCapacity, () => setCustomCapacity(""))}>إضافة السعة</button></div>
    {specifications.capacities.length > 0 && <div className="product-tags">{specifications.capacities.map((value) => <button type="button" key={value} onClick={() => toggle("capacities", value)}>{value} ×</button>)}</div>}
    <div className="admin-option-group"><span>التوافق مع الطابعات</span><div className="admin-options-grid">{printers.map((printer) => <label className="admin-check" key={printer.id}><input type="checkbox" checked={specifications.compatiblePrinters.includes(printer.name)} onChange={() => toggle("compatiblePrinters", printer.name)} /> {printer.name}</label>)}</div></div>
    <div className="admin-two-columns"><label>موديل آخر<input value={customPrinter} onChange={(event) => setCustomPrinter(event.target.value)} /></label><button type="button" onClick={() => addCustom("compatiblePrinters", customPrinter, () => setCustomPrinter(""))}>إضافة الموديل</button></div>
    {(["features", "uses"] as const).map((field) => <div className="admin-dynamic-list" key={field}>
      <div className="admin-dynamic-list-head"><b>{field === "features" ? "المميزات الرئيسية" : "الاستخدامات المناسبة"}</b><button type="button" onClick={() => update({ [field]: [...specifications[field], ""] })}>إضافة عنصر</button></div>
      {specifications[field].map((item, index) => <div className="admin-dynamic-item" key={index}><label>{field === "features" ? "الميزة" : "الاستخدام"}<input value={item} onChange={(event) => updateListItem(field, index, event.target.value)} /></label><button className="admin-remove-item" type="button" onClick={() => update({ [field]: specifications[field].filter((_, itemIndex) => itemIndex !== index) })}>حذف</button></div>)}
    </div>)}
  </fieldset>;
}

function PaperSpecificationsEditor({ product, onChange }: { product: StoredProduct; onChange: (patch: Partial<StoredProduct>) => void }) {
  const specifications = product.paperSpecifications ?? {
    ...createEmptyPaperSpecifications(),
    nameAr: product.name || null,
    brand: product.family || null,
    paperType: product.type || null,
    size: product.size || null,
  };
  const updateSpecifications = (patch: Partial<PaperSpecifications>, productPatch: Partial<StoredProduct> = {}) => onChange({
    ...productPatch,
    paperSpecifications: { ...specifications, ...patch },
  });
  const numberOrNull = (value: string) => value === "" ? null : Number(value);
  const toggleListValue = (key: "printerCompatibility" | "uses", value: string) => {
    const values = specifications[key];
    updateSpecifications({ [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] });
  };
  const customUses = specifications.uses.filter((value) => !PAPER_USAGE_OPTIONS.includes(value as typeof PAPER_USAGE_OPTIONS[number]));

  return <fieldset className="printer-specifications-editor paper-specifications-editor">
    <legend>مواصفات الأوراق المنظمة</legend>
    <p className="admin-help-text">أدخل المواصفات المتاحة فقط. ستظهر أهم أربع مواصفات في البطاقة، وبقية التفاصيل داخل صفحة المنتج.</p>

    <div className="admin-two-columns">
      <label>الاسم العربي<input required={!specifications.nameEn} value={specifications.nameAr ?? ""} onChange={(event) => {
        const nameAr = event.target.value;
        updateSpecifications({ nameAr: nameAr || null }, { name: nameAr || specifications.nameEn || "" });
      }} /></label>
      <label>الاسم الإنجليزي<input dir="ltr" required={!specifications.nameAr} value={specifications.nameEn ?? ""} onChange={(event) => {
        const nameEn = event.target.value;
        updateSpecifications({ nameEn: nameEn || null }, { name: specifications.nameAr || nameEn });
      }} /></label>
    </div>

    <div className="admin-two-columns">
      <label>العلامة التجارية<input value={specifications.brand ?? ""} onChange={(event) => {
        const brand = event.target.value;
        updateSpecifications({ brand: brand || null }, { family: [brand, specifications.series].filter(Boolean).join(" ") });
      }} /></label>
      <label>السلسلة<input value={specifications.series ?? ""} onChange={(event) => {
        const series = event.target.value;
        updateSpecifications({ series: series || null }, { family: [specifications.brand, series].filter(Boolean).join(" ") });
      }} /></label>
    </div>

    <div className="admin-two-columns">
      <label>نوع الورق<select value={specifications.paperType ?? ""} onChange={(event) => {
        const paperType = event.target.value || null;
        updateSpecifications({
          paperType,
          printSides: isDoubleSidePaperType(paperType) ? "double" : specifications.printSides,
          selfAdhesive: isSelfAdhesivePaperType(paperType) ? true : null,
          thermalTransfer: isSublimationPaperType(paperType) ? specifications.thermalTransfer : null,
          inkCompatibility: isSublimationPaperType(paperType) ? specifications.inkCompatibility : null,
          quickDry: isSublimationPaperType(paperType) ? specifications.quickDry : null,
        }, { type: paperType ?? "" });
      }}><option value="">غير محدد</option>{specifications.paperType && !PAPER_TYPE_OPTIONS.includes(specifications.paperType as typeof PAPER_TYPE_OPTIONS[number]) && <option value={specifications.paperType}>{specifications.paperType} (قيمة حالية)</option>}{PAPER_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>السطح<select value={specifications.surface ?? ""} onChange={(event) => updateSpecifications({ surface: event.target.value || null })}><option value="">غير محدد</option>{specifications.surface && !PAPER_SURFACE_OPTIONS.includes(specifications.surface as typeof PAPER_SURFACE_OPTIONS[number]) && <option value={specifications.surface}>{specifications.surface} (قيمة حالية)</option>}{PAPER_SURFACE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    </div>

    <div className="admin-two-columns">
      <label>المقاس<select value={specifications.size ?? ""} onChange={(event) => {
        const size = event.target.value || null;
        updateSpecifications({ size }, { size: size ?? "" });
      }}><option value="">غير محدد</option>{PAPER_PRODUCT_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>الأبعاد<input dir="ltr" value={specifications.dimensions ?? ""} onChange={(event) => updateSpecifications({ dimensions: event.target.value || null })} placeholder="210 × 297 mm" /></label>
    </div>

    <div className="admin-three-columns">
      <label>الوزن gsm<input type="number" min="0" step="any" value={specifications.weightGsm ?? ""} onChange={(event) => updateSpecifications({ weightGsm: numberOrNull(event.target.value) })} /></label>
      <label>عدد الأوراق<input type="number" min="0" value={specifications.sheetCount ?? ""} onChange={(event) => updateSpecifications({ sheetCount: numberOrNull(event.target.value) })} /></label>
      <label>أوجه الطباعة<select disabled={isDoubleSidePaperType(specifications.paperType)} value={specifications.printSides ?? "unknown"} onChange={(event) => updateSpecifications({ printSides: event.target.value === "single" || event.target.value === "double" ? event.target.value as PaperPrintSides : null })}>{PAPER_PRINT_SIDE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{isDoubleSidePaperType(specifications.paperType) && <small>ضُبط تلقائياً حسب نوع الورق</small>}</label>
    </div>

    <div className="admin-option-group"><span>توافق الطابعات</span><div className="admin-options-grid">{PAPER_PRINTER_COMPATIBILITY_OPTIONS.map((option) => <label className="admin-check" key={option}><input type="checkbox" checked={specifications.printerCompatibility.includes(option)} onChange={() => toggleListValue("printerCompatibility", option)} /> {option}</label>)}</div></div>

    {isSelfAdhesivePaperType(specifications.paperType) && <div className="paper-dynamic-specifications"><h3>مواصفات الورق ذاتي اللصق</h3><TriStateField label="ذاتي اللصق" value={specifications.selfAdhesive} onChange={(value) => updateSpecifications({ selfAdhesive: value })} /></div>}

    {isSublimationPaperType(specifications.paperType) && <div className="paper-dynamic-specifications"><h3>مواصفات السبلميشن والنقل الحراري</h3><div className="admin-three-columns">
      <TriStateField label="سبلميشن / نقل حراري" value={specifications.thermalTransfer} onChange={(value) => updateSpecifications({ thermalTransfer: value })} />
      <label>الحبر المتوافق<input value={specifications.inkCompatibility ?? ""} onChange={(event) => updateSpecifications({ inkCompatibility: event.target.value || null })} placeholder="حبر سبلميشن" /></label>
      <TriStateField label="سريع الجفاف" value={specifications.quickDry} onChange={(value) => updateSpecifications({ quickDry: value })} />
    </div></div>}

    <div className="admin-option-group"><span>الاستخدامات</span><div className="admin-options-grid">{PAPER_USAGE_OPTIONS.map((option) => <label className="admin-check" key={option}><input type="checkbox" checked={specifications.uses.includes(option)} onChange={() => toggleListValue("uses", option)} /> {option}</label>)}</div></div>
    <label>استخدامات أخرى، افصل بفاصلة<input value={customUses.join(", ")} onChange={(event) => {
      const presetUses = specifications.uses.filter((value) => PAPER_USAGE_OPTIONS.includes(value as typeof PAPER_USAGE_OPTIONS[number]));
      const nextCustomUses = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
      updateSpecifications({ uses: [...presetUses, ...nextCustomUses] });
    }} /></label>

    <label>التوفر<select value={specifications.availability ?? "unknown"} onChange={(event) => updateSpecifications({ availability: event.target.value === "inStock" || event.target.value === "outOfStock" || event.target.value === "onRequest" ? event.target.value as PaperAvailability : null })}>{PAPER_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
  </fieldset>;
}

function PrinterSpecificationsEditor({ product, onChange }: { product: StoredProduct; onChange: (patch: Partial<StoredProduct>) => void }) {
  const specifications = product.specifications ?? createEmptyPrinterSpecifications();
  const isLq = product.printerCategory === "lq";
  const isEcoTank = product.printerCategory === "ecotank" || product.printerCategory === "ecotank-6-color";
  const isWorkForce = product.printerCategory === "workforce";
  const updateSpecifications = (patch: Partial<PrinterSpecifications>) => onChange({
    specifications: { ...specifications, ...patch },
  });
  const toggleListValue = (key: "functions" | "usage" | "printLanguages", value: string) => {
    const values = specifications[key];
    updateSpecifications({ [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] });
  };
  const numberOrNull = (value: string) => value === "" ? null : Number(value);
  const connectionFields = BOOLEAN_SPECIFICATION_FIELDS.slice(0, 4).filter((field) => !isWorkForce || field.key !== "wifi");
  const propertyFields = BOOLEAN_SPECIFICATION_FIELDS.slice(4).filter((field) =>
    (!isLq || (field.key !== "scanner" && field.key !== "adf"))
      && (!(isEcoTank || isWorkForce) || field.key !== "duplex")
      && (!isWorkForce || field.key !== "fax")
  );

  return <fieldset className="printer-specifications-editor">
    <legend>المواصفات المنظمة</legend>
    <p className="admin-help-text">اترك أي معلومة غير موثقة على «غير محدد». لن تظهر القيم غير المحددة للزبون.</p>

    <div className="admin-two-columns">
      <label>مقاس الورق<select value={specifications.paperSize ?? ""} onChange={(event) => updateSpecifications({ paperSize: event.target.value || null })}><option value="">غير محدد</option>{PAPER_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      <label>نوع الطابعة<select value={specifications.printerType ?? ""} onChange={(event) => updateSpecifications({ printerType: event.target.value || null })}><option value="">غير محدد</option>{PRINTER_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
    </div>

    <div className="admin-two-columns">
      <label>تقنية الطباعة<input value={specifications.printTechnology ?? ""} onChange={(event) => updateSpecifications({ printTechnology: event.target.value || null })} placeholder="غير محدد" /></label>
      {!isLq && <label>نمط الألوان<input value={specifications.colorMode ?? ""} onChange={(event) => updateSpecifications({ colorMode: event.target.value || null })} placeholder="غير محدد" /></label>}
    </div>

    <div className="admin-option-group"><span>الوظائف</span><div className="admin-options-grid">{PRINTER_FUNCTION_OPTIONS.map((option) => <label className="admin-check" key={option}><input type="checkbox" checked={specifications.functions.includes(option)} onChange={() => toggleListValue("functions", option)} /> {option}</label>)}</div></div>

    <div className="admin-option-group"><span>الاتصال</span><div className="admin-tristate-grid">{connectionFields.map((field) => <TriStateField key={field.key} label={field.label} value={specifications[field.key] as TriState} onChange={(value) => updateSpecifications({ [field.key]: value })} />)}</div></div>
    {isEcoTank && <div className="admin-option-group"><span>اتصال EcoTank</span><div className="admin-tristate-grid"><TriStateField label={ECOTANK_BOOLEAN_SPECIFICATION_FIELDS[0].label} value={specifications.wifiDirect} onChange={(value) => updateSpecifications({ wifiDirect: value })} /></div></div>}
    {isWorkForce && <div className="admin-option-group workforce-specifications"><span>اتصال WorkForce</span><div className="admin-tristate-grid">
      <label>توفر Wi-Fi<select value={availabilityModeToFormValue(specifications.wifiAvailability)} onChange={(event) => {
        const wifiAvailability = formValueToAvailabilityMode(event.target.value);
        updateSpecifications({ wifiAvailability, wifi: wifiAvailability === "builtIn" ? true : wifiAvailability === "none" ? false : null });
      }}>{AVAILABILITY_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <TriStateField label="Wi-Fi Direct" value={specifications.wifiDirect} onChange={(value) => updateSpecifications({ wifiDirect: value })} />
      <TriStateField label="NFC" value={specifications.nfc} onChange={(value) => updateSpecifications({ nfc: value })} />
    </div></div>}
    <div className="admin-option-group"><span>الخصائص</span><div className="admin-tristate-grid">{propertyFields.map((field) => <TriStateField key={field.key} label={field.label} value={specifications[field.key] as TriState} onChange={(value) => updateSpecifications({ [field.key]: value })} />)}</div></div>

    {(isEcoTank || isWorkForce) && <label>وضع الدوبلكس<select value={duplexModeToFormValue(specifications.duplexMode)} onChange={(event) => {
      const duplexMode = formValueToDuplexMode(event.target.value);
      updateSpecifications({ duplexMode, duplex: duplexMode === "automatic" ? true : duplexMode === "none" ? false : null });
    }}>{DUPLEX_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
    {isEcoTank && <div className="admin-option-group"><span>وسائط EcoTank</span><div className="admin-tristate-grid">{ECOTANK_BOOLEAN_SPECIFICATION_FIELDS.slice(1).map((field) => <TriStateField key={field.key} label={field.label} value={specifications[field.key] as TriState} onChange={(value) => updateSpecifications({ [field.key]: value })} />)}</div></div>}

    {isWorkForce && <div className="workforce-specifications">
      <h3>مواصفات WorkForce للأعمال</h3>
      <div className="admin-three-columns">
        <label>نظام الحبر<select value={inkSystemToFormValue(specifications.inkSystem)} onChange={(event) => updateSpecifications({ inkSystem: formValueToInkSystem(event.target.value) })}>{INK_SYSTEM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>توفر الفاكس<select value={availabilityModeToFormValue(specifications.faxMode)} onChange={(event) => {
          const faxMode = formValueToAvailabilityMode(event.target.value);
          updateSpecifications({ faxMode, fax: faxMode === "builtIn" ? true : faxMode === "none" ? false : null });
        }}>{AVAILABILITY_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>نوع مسح ADF على الوجهين<select value={adfDuplexTypeToFormValue(specifications.adfDuplexType)} onChange={(event) => updateSpecifications({ adfDuplexType: formValueToAdfDuplexType(event.target.value) })}>{ADF_DUPLEX_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <div className="admin-tristate-grid">
        <TriStateField label="مسح الوجهين" value={specifications.duplexScanning} onChange={(value) => updateSpecifications({ duplexScanning: value })} />
        <TriStateField label="دعم وحدات التشطيب" value={specifications.finisherSupport} onChange={(value) => updateSpecifications({ finisherSupport: value })} />
      </div>
      <div className="admin-two-columns">
        <label>سعة الورق القياسية<input type="number" min="0" value={specifications.standardPaperCapacity ?? ""} onChange={(event) => updateSpecifications({ standardPaperCapacity: numberOrNull(event.target.value) })} /></label>
        <label>سعة الورق القصوى<input type="number" min="0" value={specifications.maximumPaperCapacity ?? ""} onChange={(event) => updateSpecifications({ maximumPaperCapacity: numberOrNull(event.target.value) })} /></label>
      </div>
      <div className="admin-option-group"><span>لغات الطباعة</span><div className="admin-options-grid">{PRINT_LANGUAGE_OPTIONS.map((option) => <label className="admin-check" key={option}><input type="checkbox" checked={specifications.printLanguages.includes(option)} onChange={() => toggleListValue("printLanguages", option)} /> {option}</label>)}</div></div>
    </div>}

    <div className="admin-three-columns">
      {!isLq && <label>عدد الألوان<input type="number" min="0" value={specifications.colorCount ?? ""} onChange={(event) => updateSpecifications({ colorCount: numberOrNull(event.target.value) })} /></label>}
      <label>سرعة الطباعة<input type="number" min="0" step="any" value={specifications.printSpeed ?? ""} onChange={(event) => updateSpecifications({ printSpeed: numberOrNull(event.target.value) })} /></label>
      <label>وحدة السرعة<select value={specifications.speedUnit ?? ""} onChange={(event) => updateSpecifications({ speedUnit: event.target.value || null })}><option value="">غير محدد</option>{SPEED_UNIT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      {!isLq && <label>سعة ADF<input type="number" min="0" value={specifications.adfCapacity ?? ""} onChange={(event) => updateSpecifications({ adfCapacity: numberOrNull(event.target.value) })} /></label>}
      {isEcoTank && <label>زمن طباعة الصورة بالثواني<input type="number" min="0" step="any" value={specifications.photoPrintTimeSeconds ?? ""} onChange={(event) => updateSpecifications({ photoPrintTimeSeconds: numberOrNull(event.target.value) })} /></label>}
    </div>

    <label>{isLq ? "نوع المستهلك" : "نوع الحبر"}<select value={specifications.inkType ?? ""} onChange={(event) => updateSpecifications({ inkType: event.target.value || null })}><option value="">غير محدد</option>{INK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>

    <div className="admin-option-group"><span>الاستخدام المناسب</span><div className="admin-options-grid">{PRINTER_USAGE_OPTIONS.map((option) => <label className="admin-check" key={option}><input type="checkbox" checked={specifications.usage.includes(option)} onChange={() => toggleListValue("usage", option)} /> {option}</label>)}</div></div>

    {isLq && <div className="lq-specifications"><h3>مواصفات الطابعة النقطية</h3><div className="admin-two-columns">
      <label>عدد الإبر<input type="number" min="0" value={specifications.dotMatrixPins ?? ""} onChange={(event) => updateSpecifications({ dotMatrixPins: numberOrNull(event.target.value) })} /></label>
      <label>عدد أعمدة الطباعة<input type="number" min="0" value={specifications.printColumns ?? ""} onChange={(event) => updateSpecifications({ printColumns: numberOrNull(event.target.value) })} /></label>
      <label>عدد نسخ الورق المتعدد<input type="number" min="0" value={specifications.multipartCopies ?? ""} onChange={(event) => updateSpecifications({ multipartCopies: numberOrNull(event.target.value) })} /></label>
      <label>عمر الشريط<input type="number" min="0" value={specifications.ribbonYield ?? ""} onChange={(event) => updateSpecifications({ ribbonYield: numberOrNull(event.target.value) })} /></label>
    </div><div className="admin-option-group"><span>واجهات اتصال الطابعة النقطية</span><div className="admin-tristate-grid">{LQ_INTERFACE_SPECIFICATION_FIELDS.map((field) => <TriStateField key={field.key} label={field.label} value={specifications[field.key] as TriState} onChange={(value) => updateSpecifications({ [field.key]: value })} />)}</div></div></div>}

    <div className="admin-two-columns">
      <label>رابط مصدر المواصفات<input dir="ltr" type="url" value={product.specificationsSourceUrl ?? ""} onChange={(event) => onChange({ specificationsSourceUrl: event.target.value || undefined })} placeholder="https://" /></label>
      <label>تاريخ التحقق<input type="datetime-local" value={product.specificationsVerifiedAt?.slice(0, 16) ?? ""} onChange={(event) => onChange({ specificationsVerifiedAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></label>
    </div>
  </fieldset>;
}

function TriStateField({ label, value, onChange }: { label: string; value: TriState; onChange: (value: TriState) => void }) {
  return <label>{label}<select value={triStateToFormValue(value)} onChange={(event) => onChange(formValueToTriState(event.target.value))}>{TRI_STATE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

function InkImagesEditor({
  images,
  uploading,
  onUpload,
  onChange,
}: {
  images: string[];
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onChange: (images: string[], removedImage?: string) => void;
}) {
  const move = (index: number, step: -1 | 1) => {
    const target = index + step;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return <fieldset className="ink-images-editor">
    <legend>صور منتج الحبر</legend>
    <label className="real-image-field">إضافة صور
      <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUpload} disabled={uploading} />
      <span>{uploading ? "جاري رفع الصور..." : "اختيار صورة أو عدة صور"}</span>
    </label>
    {images.length > 0 && <div className="ink-admin-images">{images.map((image, index) => <article key={image}>
      <img src={normalizeMediaUrl(image)} alt={`صورة الحبر ${index + 1}`} />
      <b>{index === 0 ? "الصورة الرئيسية" : `الصورة ${index + 1}`}</b>
      <div>
        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="تحريك الصورة للأمام">→</button>
        <button type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1} aria-label="تحريك الصورة للخلف">←</button>
        <button type="button" className="admin-remove-item" onClick={() => {
          if (window.confirm("هل تريد إزالة هذه الصورة؟")) onChange(images.filter((_, imageIndex) => imageIndex !== index), image);
        }}>حذف</button>
      </div>
    </article>)}</div>}
  </fieldset>;
}

function ImageField({ value, onUpload, onRemove, label = "الصورة", actionText = "اختيار صورة من الجهاز" }: { value: string; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; label?: string; actionText?: string }) {
  return <div className="real-image-control"><label className="real-image-field">{label}{value && <img src={normalizeMediaUrl(value)} alt="معاينة" />}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUpload} /><span>{actionText}</span></label>{value && <button type="button" className="media-remove-button" onClick={onRemove}>حذف الصورة</button>}</div>;
}

function ImageEditor({ title, value, onUpload, onRemove }: { title: string; value: string; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return <div className="real-admin-card"><h2>{title}</h2><ImageField value={value} onUpload={onUpload} onRemove={onRemove} /></div>;
}
