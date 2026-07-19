/* eslint-disable @next/next/no-img-element */
"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MAX_IMAGE_UPLOAD_BYTES, isSupportedImageMimeType } from "../../lib/image-file-validation";
import { MEDIA_PROXY_PATH_PREFIX, normalizeMediaUrl } from "../../lib/media-url";
import { optimizeImageForUpload } from "../image-upload-optimizer";
import { defaultHeroSettings, defaultSiteSettings, type HeroSettings, type HeroSlide, type SiteSettings, type StoredProduct } from "../site-defaults";

const categories = [
  ["printers", "طابعات EPSON"], ["laptops", "اللابتوبات"], ["engraving-presses", "آلات النحت والمكابس"],
  ["inks", "الأحبار"], ["papers", "الأوراق"], ["advertising-machines", "آلات الدعاية والإعلان"],
  ["electronics", "الإكسسوارات الإلكترونية"], ["cameras", "الكاميرات"], ["3d-printers", "طابعات ثلاثية الأبعاد"],
  ["money-machines", "آلات عد وفحص النقود"], ["networks", "الشبكات وأجهزة الواي فاي"],
] as const;

const emptyProduct: StoredProduct = {
  id: 0, name: "", family: "", image: "", category: "printers", type: "متعددة الوظائف", size: "A4",
  badge: "", price: "", description: "", features: [],
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

export default function AdminDashboard({ userName, signOutPath }: { userName: string; signOutPath: string }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [productForm, setProductForm] = useState<StoredProduct>(emptyProduct);
  const [featuresText, setFeaturesText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultHeroSettings);
  const [heroForm, setHeroForm] = useState<HeroSlide>(emptyHeroSlide);
  const [editingHeroId, setEditingHeroId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"page" | "ads" | "hero" | "products">("page");
  const [status, setStatus] = useState("جاري تحميل بيانات الموقع...");
  const [saving, setSaving] = useState(false);
  const [heroSaving, setHeroSaving] = useState(false);
  const pendingMediaDeletes = useRef(new Set<string>());

  useEffect(() => {
    fetch("/api/site").then(async (response) => {
      const data = await response.json() as { error?: string; settings?: Partial<SiteSettings>; products?: StoredProduct[] };
      if (!response.ok) throw new Error(data.error || "تعذر التحميل");
      const nextSettings = { ...defaultSiteSettings, ...data.settings };
      setSettings({
        ...nextSettings,
        logoImage: normalizeMediaUrl(nextSettings.logoImage),
        heroImage: normalizeMediaUrl(nextSettings.heroImage),
        featureImage: normalizeMediaUrl(nextSettings.featureImage),
      });
      setProducts(Array.isArray(data.products)
        ? data.products.map((product) => ({ ...product, image: normalizeMediaUrl(product.image) }))
        : []);
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

  const updateSetting = (key: keyof SiteSettings, value: string) => setSettings((current) => ({ ...current, [key]: value }));

  const queueMediaRemoval = (url: string) => {
    const normalizedUrl = normalizeMediaUrl(url);
    if (normalizedUrl.startsWith(MEDIA_PROXY_PATH_PREFIX) || url.startsWith("https://")) {
      pendingMediaDeletes.current.add(normalizedUrl);
    }
  };

  const activeMediaUrls = (nextSettings = settings, nextProducts = products, nextHeroSlides = heroSlides) => new Set([
    normalizeMediaUrl(nextSettings.logoImage),
    normalizeMediaUrl(nextSettings.heroImage),
    normalizeMediaUrl(nextSettings.featureImage),
    ...nextProducts.map((product) => normalizeMediaUrl(product.image)),
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

  const uploadImage = async (
    event: ChangeEvent<HTMLInputElement>,
    currentUrl: string,
    onUploaded: (url: string) => void,
    folder: "logos" | "banners" | "products" | "general" = "general",
  ) => {
    const input = event.currentTarget;
    const selectedFile = input.files?.[0];
    if (!selectedFile) return;
    if (!isSupportedImageMimeType(selectedFile.type)) {
      setStatus("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو GIF");
      input.value = "";
      return;
    }

    setStatus(selectedFile.type === "image/gif" ? "جاري تجهيز الصورة..." : "جاري ضغط وتجهيز الصورة...");
    let file = selectedFile;
    try {
      file = await optimizeImageForUpload(selectedFile);
    } catch {
      file = selectedFile;
    }

    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setStatus("حجم الصورة يجب ألا يتجاوز 4MB بعد المعالجة");
      input.value = "";
      return;
    }
    setStatus("جاري رفع الصورة...");
    const body = new FormData();
    body.append("file", file);
    body.append("folder", folder);
    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = await response.json() as { error?: string; url?: string };
      if (!response.ok) throw new Error(data.error || "تعذر رفع الصورة");
      if (!data.url) throw new Error("لم يُرجع الخادم رابط الصورة");
      const uploadedUrl = normalizeMediaUrl(data.url);
      if (currentUrl && normalizeMediaUrl(currentUrl) !== uploadedUrl) queueMediaRemoval(currentUrl);
      onUploaded(uploadedUrl);
      setStatus("تم رفع الصورة، اضغط حفظ جميع التعديلات");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر رفع الصورة");
    }
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
        body: JSON.stringify({ settings, products }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "تعذر الحفظ");
      const deleteFailures = await flushPendingMediaDeletes(activeMediaUrls(settings, products, heroSlides));
      setStatus(deleteFailures
        ? "تم حفظ التعديلات، لكن تعذر تنظيف بعض الصور القديمة"
        : "تم حفظ التعديلات وأصبحت ظاهرة للزوار ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const saveProductDraft = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...productForm, id: editingId ?? Date.now(), features: featuresText.split(",").map((item) => item.trim()).filter(Boolean) };
    setProducts((current) => editingId ? current.map((item) => item.id === editingId ? next : item) : [next, ...current]);
    setProductForm(emptyProduct);
    setFeaturesText("");
    setEditingId(null);
    setStatus("تم تجهيز تعديل المنتجات، اضغط حفظ جميع التعديلات");
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
      const deleteFailures = await flushPendingMediaDeletes(activeMediaUrls(settings, products, nextSlides));
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
      setStatus("تم حفظ إعدادات البانر بنجاح ✓");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "تعذر حفظ إعدادات البانر");
    } finally {
      setHeroSaving(false);
    }
  };

  const editProduct = (product: StoredProduct) => {
    setEditingId(product.id);
    setProductForm(product);
    setFeaturesText(product.features.join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <main dir="rtl" className="real-admin-page">
    <header className="real-admin-header"><div><span>لوحة تحكم حقيقية</span><h1>إدارة موقع وكالة إسحاق</h1><p>مرحبًا، {userName}</p></div><div className="real-admin-header-actions"><Link href="/">عرض الموقع</Link><a href={signOutPath}>تسجيل الخروج</a></div></header>
    <div className="real-admin-toolbar"><nav aria-label="أقسام لوحة التحكم">
      <button className={activeTab === "page" ? "active" : ""} onClick={() => setActiveTab("page")}>بيانات الصفحة</button>
      <button className={activeTab === "ads" ? "active" : ""} onClick={() => setActiveTab("ads")}>الإعلانات والصور</button>
      <button className={activeTab === "hero" ? "active" : ""} onClick={() => setActiveTab("hero")}>إدارة البانر المتحرك</button>
      <button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")}>المنتجات</button>
    </nav><button className="save-all-button" onClick={saveAll} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ جميع التعديلات"}</button></div>
    <p className="admin-live-status" role="status">{status}</p>

    {activeTab === "page" && <section className="real-admin-grid">
      <div className="real-admin-card"><h2>بيانات التواصل</h2>
        <label>العنوان<input value={settings.address} onChange={(e) => updateSetting("address", e.target.value)} /></label>
        <label>رقم المبيعات<input dir="ltr" value={settings.salesPhone} onChange={(e) => updateSetting("salesPhone", e.target.value)} /></label>
        <label>رقم خدمة العملاء<input dir="ltr" value={settings.customerServicePhone} onChange={(e) => updateSetting("customerServicePhone", e.target.value)} /></label>
        <label>واتساب العام<input dir="ltr" value={settings.generalWhatsapp} onChange={(e) => updateSetting("generalWhatsapp", e.target.value)} /></label>
      </div>
      <div className="real-admin-card"><h2>أوقات العمل</h2>
        <label>أيام العمل<input value={settings.workDays} onChange={(e) => updateSetting("workDays", e.target.value)} /></label>
        <label>ساعات العمل<input value={settings.workHours} onChange={(e) => updateSetting("workHours", e.target.value)} /></label>
      </div>
      <div className="real-admin-card"><h2>قسم الصيانة</h2>
        <label>العنوان<input value={settings.maintenanceTitle} onChange={(e) => updateSetting("maintenanceTitle", e.target.value)} /></label>
        <label>الوصف<textarea value={settings.maintenanceDescription} onChange={(e) => updateSetting("maintenanceDescription", e.target.value)} /></label>
      </div>
      <div className="real-admin-card"><h2>بانر التواصل</h2>
        <label>النص الصغير<input value={settings.contactKicker} onChange={(e) => updateSetting("contactKicker", e.target.value)} /></label>
        <label>العنوان<input value={settings.contactTitle} onChange={(e) => updateSetting("contactTitle", e.target.value)} /></label>
      </div>
    </section>}

    {activeTab === "ads" && <section className="real-admin-grid">
      <ImageEditor title="شعار الموقع" value={settings.logoImage} onUpload={(event) => uploadImage(event, settings.logoImage, (url) => updateSetting("logoImage", url), "logos")} onRemove={() => removeImage(settings.logoImage, () => updateSetting("logoImage", ""))} />
      <div className="real-admin-card"><h2>الإعلان الرئيسي</h2>
        <label>النص العلوي<input value={settings.heroEyebrow} onChange={(e) => updateSetting("heroEyebrow", e.target.value)} /></label>
        <label>العنوان<input value={settings.heroTitle} onChange={(e) => updateSetting("heroTitle", e.target.value)} /></label>
        <label>النص الملون<input value={settings.heroHighlight} onChange={(e) => updateSetting("heroHighlight", e.target.value)} /></label>
        <label>الوصف<textarea value={settings.heroDescription} onChange={(e) => updateSetting("heroDescription", e.target.value)} /></label>
        <ImageField value={settings.heroImage} onUpload={(event) => uploadImage(event, settings.heroImage, (url) => updateSetting("heroImage", url), "banners")} onRemove={() => removeImage(settings.heroImage, () => updateSetting("heroImage", ""))} />
      </div>
      <div className="real-admin-card"><h2>البانر الدعائي الثاني</h2>
        <label>النص العلوي<input value={settings.featureEyebrow} onChange={(e) => updateSetting("featureEyebrow", e.target.value)} /></label>
        <label>العنوان<input value={settings.featureTitle} onChange={(e) => updateSetting("featureTitle", e.target.value)} /></label>
        <label>الوصف<textarea value={settings.featureDescription} onChange={(e) => updateSetting("featureDescription", e.target.value)} /></label>
        <ImageField value={settings.featureImage} onUpload={(event) => uploadImage(event, settings.featureImage, (url) => updateSetting("featureImage", url), "banners")} onRemove={() => removeImage(settings.featureImage, () => updateSetting("featureImage", ""))} />
      </div>
    </section>}

    {activeTab === "hero" && <section className="hero-admin-layout">
      <div className="real-admin-card hero-slides-manager">
        <div className="hero-admin-head"><h2>إدارة البانر المتحرك</h2><button type="button" onClick={() => { setEditingHeroId(null); setHeroForm({ ...emptyHeroSlide, displayOrder: heroSlides.length + 1 }); }}>إضافة شريحة جديدة</button></div>
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
        <label>العنوان<input required value={heroForm.title} onChange={(e) => setHeroForm({ ...heroForm, title: e.target.value })} /></label>
        <label>العنوان الفرعي<input value={heroForm.subtitle} onChange={(e) => setHeroForm({ ...heroForm, subtitle: e.target.value })} /></label>
        <label>الوصف<textarea required value={heroForm.description} onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })} /></label>
        <label>النص الصغير<input value={heroForm.badgeText} onChange={(e) => setHeroForm({ ...heroForm, badgeText: e.target.value })} /></label>
        <ImageField value={heroForm.imageUrl} onUpload={(event) => uploadImage(event, heroForm.imageUrl, (url) => setHeroForm({ ...heroForm, imageUrl: url }), "banners")} onRemove={() => removeImage(heroForm.imageUrl, () => setHeroForm({ ...heroForm, imageUrl: "" }))} label="الصورة" actionText={heroForm.imageUrl ? "استبدال الصورة" : "اختيار صورة"} />
        <label>وصف الصورة<input value={heroForm.imageAlt} onChange={(e) => setHeroForm({ ...heroForm, imageAlt: e.target.value })} /></label>
        <div className="admin-two-columns"><label>نص الزر الأول<input value={heroForm.primaryButtonText} onChange={(e) => setHeroForm({ ...heroForm, primaryButtonText: e.target.value })} /></label><label>رابط الزر الأول<input dir="ltr" value={heroForm.primaryButtonUrl} onChange={(e) => setHeroForm({ ...heroForm, primaryButtonUrl: e.target.value })} /></label></div>
        <div className="admin-two-columns"><label>نص الزر الثاني<input value={heroForm.secondaryButtonText} onChange={(e) => setHeroForm({ ...heroForm, secondaryButtonText: e.target.value })} /></label><label>رابط الزر الثاني<input dir="ltr" value={heroForm.secondaryButtonUrl} onChange={(e) => setHeroForm({ ...heroForm, secondaryButtonUrl: e.target.value })} /></label></div>
        <div className="admin-two-columns"><label>ترتيب الشريحة<input type="number" value={heroForm.displayOrder} onChange={(e) => setHeroForm({ ...heroForm, displayOrder: Number(e.target.value) })} /></label><label>حالة الشريحة<select value={heroForm.isActive ? "visible" : "hidden"} onChange={(e) => setHeroForm({ ...heroForm, isActive: e.target.value === "visible" })}><option value="visible">ظاهرة</option><option value="hidden">مخفية</option></select></label></div>
        <div className="product-editor-actions"><button type="submit" disabled={heroSaving}>{heroSaving ? "جاري الحفظ..." : editingHeroId ? "حفظ التعديل" : "إضافة الشريحة"}</button><button type="button" onClick={() => { setEditingHeroId(null); setHeroForm(emptyHeroSlide); }}>تفريغ</button></div>
      </form>

      <div className="real-admin-card hero-settings-card">
        <h2>إعدادات الحركة</h2>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.autoplayEnabled} onChange={(e) => setHeroSettings({ ...heroSettings, autoplayEnabled: e.target.checked })} /> تشغيل الحركة التلقائية</label>
        <label>سرعة الانتقال بالثواني<input type="number" min="1" max="30" value={Math.round(heroSettings.autoplayDelay / 1000)} onChange={(e) => setHeroSettings({ ...heroSettings, autoplayDelay: Math.max(1, Number(e.target.value)) * 1000 })} /></label>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.showArrows} onChange={(e) => setHeroSettings({ ...heroSettings, showArrows: e.target.checked })} /> إظهار الأسهم</label>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.showDots} onChange={(e) => setHeroSettings({ ...heroSettings, showDots: e.target.checked })} /> إظهار النقاط</label>
        <label className="admin-check"><input type="checkbox" checked={heroSettings.pauseOnHover} onChange={(e) => setHeroSettings({ ...heroSettings, pauseOnHover: e.target.checked })} /> التوقف عند مرور الماوس</label>
        <button className="save-all-button" type="button" onClick={saveHeroSettings} disabled={heroSaving}>{heroSaving ? "جاري الحفظ..." : "حفظ إعدادات البانر"}</button>
      </div>
    </section>}

    {activeTab === "products" && <section className="product-admin-layout">
      <form className="real-admin-card product-editor" onSubmit={saveProductDraft}><h2>{editingId ? "تعديل المنتج" : "إضافة منتج"}</h2>
        <label>القسم<select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>اسم المنتج<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label>
        <label>العلامة أو العائلة<input value={productForm.family} onChange={(e) => setProductForm({ ...productForm, family: e.target.value })} /></label>
        <div className="admin-two-columns"><label>المواصفة<input value={productForm.size} onChange={(e) => setProductForm({ ...productForm, size: e.target.value })} /></label><label>النوع<input value={productForm.type} onChange={(e) => setProductForm({ ...productForm, type: e.target.value })} /></label></div>
        <div className="admin-two-columns"><label>الشارة<input value={productForm.badge ?? ""} onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })} /></label><label>السعر<input value={productForm.price ?? ""} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label></div>
        <label>الوصف<textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label>
        <label>المميزات، افصل بفاصلة<input value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} /></label>
        <ImageField value={productForm.image} onUpload={(event) => uploadImage(event, productForm.image, (url) => setProductForm({ ...productForm, image: url }), "products")} onRemove={() => removeImage(productForm.image, () => setProductForm({ ...productForm, image: "" }))} />
        <div className="product-editor-actions"><button type="submit">{editingId ? "تجهيز التعديل" : "إضافة للقائمة"}</button><button type="button" onClick={() => { setEditingId(null); setProductForm(emptyProduct); setFeaturesText(""); }}>تفريغ</button></div>
      </form>
      <div className="real-admin-card products-manager"><h2>المنتجات الحالية ({products.length})</h2>{products.map((product) => <article key={product.id}><img src={normalizeMediaUrl(product.image) || "/brand/eshak-logo.png"} alt="" /><div><b>{product.name}</b><span>{categories.find(([value]) => value === product.category)?.[1]}</span></div><button onClick={() => editProduct(product)}>تعديل</button><button className="delete-product" onClick={() => { queueMediaRemoval(product.image); setProducts((current) => current.filter((item) => item.id !== product.id)); setStatus("تم حذف المنتج من القائمة، اضغط حفظ جميع التعديلات"); }}>حذف</button></article>)}</div>
    </section>}
  </main>;
}

function ImageField({ value, onUpload, onRemove, label = "الصورة", actionText = "اختيار صورة من الجهاز" }: { value: string; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void; label?: string; actionText?: string }) {
  return <div className="real-image-control"><label className="real-image-field">{label}{value && <img src={normalizeMediaUrl(value)} alt="معاينة" />}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUpload} /><span>{actionText}</span></label>{value && <button type="button" className="media-remove-button" onClick={onRemove}>حذف الصورة</button>}</div>;
}

function ImageEditor({ title, value, onUpload, onRemove }: { title: string; value: string; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return <div className="real-admin-card"><h2>{title}</h2><ImageField value={value} onUpload={onUpload} onRemove={onRemove} /></div>;
}
