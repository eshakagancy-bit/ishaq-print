# سياق ومرجع مشروع: وكالة إسحاق العالمية (eshak-global-agency-vercel)

> هذا الملف هو المرجع الأساسي والشامل لمعمارية وهندسة موقع وكالة إسحاق العالمية. يُعتمد عليه لفهم النظام والعمليات التشغيلية دون الحاجة لإعادة استكشاف الكود من الصفر.

---

## 1. نظرة عامة على المشروع (Project Overview)

- **الاسم التجاري:** وكالة إسحاق العالمية للتقنيات والحلول المتكاملة (وكيل وموزع معتمد لمنتجات EPSON وحلول الطباعة والملحقات في اليمن).
- **الموقع المنشور (Production):** [https://ishaq-print-zeta.vercel.app/](https://ishaq-print-zeta.vercel.app/)
- **مستودع GitHub:** `https://github.com/eshakagancy-bit/ishaq-print.git` (الفرع الأساسي: `main`).
- **منصة الاستضافة:** Vercel (Next.js Managed Runtime).
- **منصة البيانات والتخزين:** Supabase (PostgreSQL Database & Storage Buckets).
- **طبيعة التطبيق:** موقع إلكتروني احترافي لعرض المنتجات، كتالوج رقمي، سلة طلبات مباشرة عبر واتساب، نظام بحث ذكي، مع لوحة إدارة كاملة ومحمية لإدارة المحتوى والمنتجات والبانرات بدون وسيط خارجي.

---

## 2. حزمة التقنيات والإصدارات (Tech Stack)

| التقنية / المكتبة | الإصدار | الغرض |
| :--- | :--- | :--- |
| **Node.js** | `24.x` (Engine) | بيئة التشغيل الأساسية |
| **Next.js** | `16.2.6` (App Router) | إطار العمل الكامل (Server Components, Route Handlers, SSR/SSG) |
| **React / React DOM** | `19.2.6` | واجهة المستخدم التفاعلية |
| **TypeScript** | `5.9.3` | كتابة كود منضبط وخالٍ من أخطاء الأنواع |
| **@supabase/supabase-js**| `^2.110.6` | العميل الخادمي للاتصال بقاعدة بيانات Supabase ومساحة التخزين |
| **ESLint** | `9.39.4` + `eslint-config-next 16.2.6` | فحص جودة الكود والالتزام بالمعايير |
| **Node Test Runner** | مدمج (`node --test`) | تشغيل الاختبارات الآلية الشاملة (305+ اختبار) |
| **التصميم والأنماط** | Pure CSS (`app/globals.css`) | نظام تصميم مخصص، سريع وخفيف بدون أطر عمل خارجية ضخمة |

---

## 3. خريطة المجلدات والملفات المهمة (Directory Map)

```text
eshak-global-agency-vercel/
├── app/                               # مسارات App Router ومكونات الواجهة
│   ├── admin/                         # لوحة التحكم ومكوناتها
│   │   ├── page.tsx                   # صفحة لوحة التحكم
│   │   └── admin-dashboard.tsx        # مكون لوحة التحكم التفاعلي الكامل
│   ├── api/                           # واجهات Route Handlers الخادمة
│   │   ├── admin/                     # مسارات الإدارة الحساسة (تسجيل دخول، بانر، ترتيب)
│   │   ├── hero-slides/               # جلب شرائح البانر للعامة
│   │   ├── media/[...path]/           # بروكسي خادمي آمن لصور التخزين
│   │   ├── site/                      # قراءة وتعديل وحذف المنتجات والإعدادات
│   │   └── upload/                    # رفع وحذف الصور في Supabase Storage
│   ├── categories/                    # صفحة دليل وتصنيفات المنتجات
│   ├── inks/                          # تصنيف وصفحات تفاصيل الأحبار
│   ├── laser-inks/                    # تصنيف أحبار الليزر
│   ├── maintenance/                   # صفحة الصيانة وخدمات ما بعد البيع
│   ├── papers/                        # تصنيف وصفحات تفاصيل الأوراق
│   ├── printers/                      # تصنيف وصفحات تفاصيل الطابعات
│   ├── admin-auth.ts                  # التحقق من جلسة الأدمن وأمان Origin
│   ├── admin-session.ts               # تشفير وتوقيع جلسات HMAC
│   ├── globals.css                    # الأنماط والتصميم الشامل للموقع
│   ├── global-product-search.ts       # محرك البحث الذكي والتطبيع العربي
│   ├── home-client.tsx                # المكون التفاعلي للصفحة الرئيسية
│   ├── layout.tsx                     # الهيكل الرئيسي وجلب البيانات الأساسية
│   ├── order-cart.ts                  # منطق سلة الطلبات وتوليد رسالة واتساب
│   ├── order-cart-provider.tsx        # سياق Context لسلة المشتريات
│   ├── page.tsx                       # الصفحة الرئيسية (Server Component)
│   ├── robots.ts                      # إعدادات روبوتات الفهرسة
│   ├── seo.ts / seo-constants.js      # إعدادات Metadata المشتركة
│   ├── site-defaults.ts               # البيانات الافتراضية والأنواع (Types)
│   ├── sitemap.ts                     # توليد خريطة الموقع الديناميكية XML
│   └── structured-data.ts             # بيانات JSON-LD (Schema.org)
├── lib/                               # الطبقة الخادمة والاتصال بقاعدة البيانات
│   ├── image-file-validation.ts       # التحقق من تواقيع الصور (Magic Bytes)
│   ├── image-storage-path.ts          # توليد مسارات التخزين والـ UUID
│   ├── indexnow.ts                    # الإشعار التلقائي لمحركات البحث
│   ├── media-url.ts                   # تطبيع مسارات الصور وبروكسي الميديا
│   ├── site-database.ts               # دوال استعلام وتحديث PostgreSQL و Supabase
│   ├── supabase-server.ts             # عميل Supabase الإداري الوحيد (Service Role)
│   └── supabase-storage.ts            # دوال الرفع والحذف من Supabase Storage
├── public/                            # الملفات الثابتة (شعار، صور أقسام، أيقونات)
├── scripts/                           # سكربتات صيانة وترحيل البيانات
├── supabase/                          # ملفات إعداد ومخطط قاعدة البيانات
│   ├── migrations/                    # سجل تاريخ التعديلات والترقيات
│   └── setup.sql                      # ملف المخطط الكامل والدوال وجداول الموقع
├── tests/                             # حزمة الاختبارات الشاملة (305+ اختبار)
├── .env.example                       # نموذج المتغيرات البيئية المطلوبة
├── AGENTS.md                          # دليل وقواعد وكلاء الذكاء الاصطناعي (User Rules لـ Antigravity)
├── PROJECT_CONTEXT.md                 # المرجع المعماري الشامل وذاكرة المشروع الدائمة
├── next.config.ts                     # إعدادات Next.js ورؤوس الأمان
├── package.json                       # الحزم والاعتماديات والأوامر
├── tsconfig.json                      # إعدادات TypeScript
└── vercel.json                        # إعدادات النشر على منصة Vercel
```

---

## 4. معمارية النظام وتدفق البيانات (Architecture & Data Flow)

```
[المتصفح / العميل]
       │
       ├───> صفحات عامة (SSR / ISR) ───> Next.js App Router (app/*)
       │                                       │
       ├───> بحث فوري & سلة ───> LocalStorage   │ (استعلام خادمي آمن)
       │                                       ▼
       ├───> لوحة التحكم (/admin) ────> Route Handlers (/api/*)
       │         (HMAC Cookie Auth)            │
       │                                       │ (SUPABASE_SERVICE_ROLE_KEY)
       │                                       ▼
       │                                [Supabase Database]
       │                                   - PostgreSQL Tables
       │                                   - Stored RPC Functions
       │                                       │
       └───> طلب الصور (/api/media/*) ─────────┴─> [Supabase Storage: site-media]
```

### المبادئ المعمارية الصارمة:
1. **انعدام الوصول المباشر من العميل لـ Supabase:** المتصفح لا يملك أي مفتاح لـ Supabase إطلاقاً. كل عمليات القراءة والكتابة تجري من خادم Next.js بواسطة `SUPABASE_SERVICE_ROLE_KEY`.
2. **عزل الصلاحيات عبر RLS:** جداول Supabase مطبق عليها `Row Level Security` مع سحب الصلاحيات من أدوار `anon` و `authenticated` وحصرها في `service_role`.
3. **أمان رفع الصور ومسار الوسائط:** الصور تمر عبر فحص Magic Bytes الحقيقي للملف وليس فقط الامتداد، وتخزن بأسماء UUID فريدة، ويتم تقديمها عبر بروكسي خادمي `/api/media/[...path]` لتفادي الروابط المكسورة أو التغييرات في نطاق التخزين.
4. **التكامل الذري (Atomic Transactions):** عمليات الحفظ الشاملة وترتيب الصفحة الرئيسية والموديلات تتم عبر دوال PostgreSQL مخزنة (Stored Functions) لتفادي تجزؤ البيانات.
5. **الفهرسة الفورية (IndexNow):** أي إضافة، تعديل، أو حذف لمنتج يرسل تلقائياً إشعاراً فورياً لمحركات البحث (Bing / IndexNow).

---

## 5. قاعدة البيانات والجداول (Database Schema)

الملف المرجعي لقاعدة البيانات هو [supabase/setup.sql](file:///c:/Users/المحور/Desktop/الموقع/eshak-global-agency-vercel/supabase/setup.sql).

### 1. جدول `site_settings`
- **المفتاح الأساسي:** `id = 1`
- **الأعمدة:** `payload jsonb`, `updated_at timestamptz`.
- **المحتوى:** أرقام الهواتف (المبيعات، الصيانة، خدمة العملاء)، أوقات وساعات العمل، العنوان الجغرافي، روابط صور الأقسام والشعار، ومميزات الشراء.

### 2. جدول `products`
- **المفتاح الأساسي:** `id bigint`
- **الأعمدة:**
  - `name`: اسم المنتج (يتم تطبيعه تلقائياً لاسم العلامة التجارية مثل `EPSON`).
  - `family`, `category`, `type`, `size`, `badge`, `price`, `description`.
  - `image`: مسار الصورة الأساسية.
  - `features`: مصفوفة JSONB للمميزات السريعة.
  - `specifications`: كائن JSONB للمواصفات الفنية التفصيلية (وفق نوع المنتج: طابعة، حبر، ورق).
  - `printer_page_content`: كائن JSONB يحتوي على نصوص مخصصة لصفحة تفاصيل الطابعة/الورق.
  - `sort_order`: ترتيب الفرز العام.
  - `home_display_order`: ترتيب العرض في قسم الصفحة الرئيسية.
  - `created_at`, `updated_at`.

### 3. جدول `hero_slides`
- **المفتاح الأساسي:** `id bigint generated by default as identity`
- **الأعمدة:** `title`, `subtitle`, `description`, `badge_text`, `image_url`, `image_alt`, `primary_button_text`, `primary_button_url`, `secondary_button_text`, `secondary_button_url`, `display_order`, `is_active`.

### 4. جدول `hero_settings`
- **المفتاح الأساسي:** `id = 1`
- **الأعمدة:** `autoplay_enabled`, `autoplay_delay`, `show_arrows`, `show_dots`, `pause_on_hover`.

### 5. جدول `product_models` (الموديلات التابعة للمنتج)
- **المفتاح الأساسي:** `id bigint generated by default as identity`
- **الأعمدة:** `product_id references products(id) on delete cascade`, `model`, `part_number`, `color`, `compatibility`, `availability` ('in_stock', 'out_of_stock', 'on_request'), `price`, `image`, `sort_order`, `is_active`.

### 6. جدول `product_model_variants` (المتغيرات والألوان التابعة للموديل)
- **المفتاح الأساسي:** `id bigint generated by default as identity`
- **الأعمدة:** `product_model_id references product_models(id) on delete cascade`, `color`, `part_number`, `availability`, `image`, `sort_order`, `is_active`.

### الدوال المخزنة (Stored Functions):
- `replace_site_data(p_settings jsonb, p_products jsonb)`
- `set_home_product_order(p_items jsonb)`
- `sync_product_models(p_product_id bigint, p_models jsonb)`
- `replace_product_models(p_product_id bigint, p_models jsonb)`

---

## 6. نظام المصادقة والأمان (Authentication & Security)

- **مسار لوحة التحكم:** `/admin`
- **آلية الدخول:** التحقق من مطابقة `ADMIN_PASSWORD` (بمقارنة مشفرة بـ Constant-time تمنع التخمين).
- **إدارة الجلسة:**
  - يتم إنشاء توكن جلسة موقع بـ HMAC SHA-256 باستخدام `ADMIN_SESSION_SECRET`.
  - التوكن يحفظ في Cookie اسمها `eshak_admin_session` بخواص مشددة (`HttpOnly`, `SameSite=Lax`, `Secure` في الإنتاج).
  - مدة صلاحية الجلسة: 12 ساعة (`ADMIN_SESSION_MAX_AGE_SECONDS = 43200`).
- **حماية CSRF والأصل (Origin Validation):**
  - كل طلب تغيير بيانات (POST / PUT / PATCH / DELETE) يتم التحقق من رأس `Origin` ومطابقته لـ Host الفعلي عبر دالة `hasTrustedAdminOrigin`.
- **رؤوس الأمان (Security Headers):**
  - مجهزة في `app/security-headers.ts` وتُحقن في كل المسارات عبر `next.config.ts`:
  - `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security` (في الإنتاج).

---

## 7. نظام المنتجات والكتالوج (Product Catalog & Categories)

### الفئات المنشورة علناً في المتجر (`app/public-categories.ts`):
1. **الطابعات (`printers`):** تشمل عائلات (WorkForce, EcoTank, EcoTank 6-color, LQ).
2. **الأوراق (`papers`):** أوراق الصور، والسبليميشن، واللاصق، والأوراق المكتبية.
3. **الأحبار (`inks`):** أحبار الطابعات المكتبية والفوتوغرافية ومجموعات الألوان.
4. **أحبار الليزر (`laser_inks`):** كاسيتات وتونرات الليزر مع موديلاتها وألوانها وأرقام القطع.

*(ملاحظة: يدعم النظام فئات إضافية في لوحة الإدارة وقاعدة البيانات مثل: laptops, engraving-presses, cameras وغيرها، ويمكن تفعيلها في أي وقت بتحديث `PUBLIC_ENABLED_CATEGORIES`).*

---

## 8. السلة والبحث وتجربة المستخدم (E-Commerce & UX)

- **سلة الطلبات (`app/order-cart.ts`):**
  - سلة محلية تعمل على المتصفح عبر `localStorage` بالمفتاح `ishaq-order-cart-v1`.
  - تدعم إضافة الطابعات، الأوراق، الأحبار بمختلف خياراتها وموديلاتها وألوانها.
  - زر إتمام الطلب ينشئ رسالة منسقة ويوجه المشتري مباشرة إلى واتساب المبيعات الرسمي: `774666202` (+967774666202).
- **المفضلة (`app/product-favorite-button.tsx`):**
  - تخزين محلي على المتصفح عبر المفتاح `eshak-favorite-products`.
- **محرك البحث الذكي (`app/global-product-search.ts`):**
  - شريط بحث ودرج منبثق (Drawer) متاح في الهيدر وكافة الصفحات.
  - تطبيع لغوي شامل: إزالة التشكيل، همزات الألف، الياء والألف المقصورة، والفواصل.
  - بحث فوري في: اسم المنتج، الموديل، رقم القطعة (Part Number)، التوافق مع الطابعات، والألوان.

---

## 9. المتغيرات البيئية المطلوبة (Environment Variables)

يتم تخزينها في `.env.local` محلياً وفي إعدادات Vercel للإنتاج:

| المتغير | الوصف | الحساسية |
| :--- | :--- | :--- |
| `SUPABASE_URL` | رابط مشروع Supabase (يبدأ بـ `https://...supabase.co`) | سري خادمي |
| `SUPABASE_SERVICE_ROLE_KEY` | المفتاح الخادمي السري الكامل (Service Role Secret) | **سري للغاية** - لا يُكشف أبداً |
| `SUPABASE_STORAGE_BUCKET` | اسم حاوية التخزين (القيمة الافتراضية: `site-media`) | إعداد تشغيلي |
| `ADMIN_PASSWORD` | كلمة مرور تسجيل الدخول للوحة التحكم (8 أحرف على الأقل) | **سري للغاية** |
| `ADMIN_SESSION_SECRET` | نص عشوائي طويل لتوقيع توكن جلسة الأدمن بـ HMAC | **سري للغاية** |
| `ADMIN_AUTH_DISABLED` | يُستخدم محلياً فقط (`true`) لتجاوز المصادقة أثناء التطوير | لا يُستخدم في الإنتاج مطلقاً |

---

## 10. دورة العمليات والنشر (GitHub & Vercel Workflow)

1. المستودع البعيد: `origin` يشير إلى `https://github.com/eshakagancy-bit/ishaq-print.git`.
2. فرع الإنتاج: `main`.
3. منصة Vercel مربوطة مباشرة بمستودع GitHub.
4. **تدفق النشر التلقائي:**
   - عند عمل `git push origin main`، تبدأ منصة Vercel تلقائياً بتنفيذ عملية البناء:
     `npm ci --no-audit --no-fund` ثم `npm run build`.
   - بمجرد نجاح البناء، يتم نشر التحديث فوراً على الرابط المباشر.
5. **إجراءات الحذر:**
   - لا تدفع أي كود إلى `main` قبل تشغيل `npm run check` والتأكد من نجاح الفحوصات والاختبارات محلياً.

---

## 11. الأوامر البرمجية والتشغيلية المعتمدة (CLI Commands)

| الأمر | الغرض |
| :--- | :--- |
| `npm run dev` | تشغيل خادم التطوير المحلي على `http://localhost:3000` |
| `npm run lint` | فحص الكود والتنسيق عبر ESLint |
| `npm run typecheck` | التحقق الصارم من صحة أنواع TypeScript (`tsc --noEmit`) |
| `npm test` | تشغيل حزمة الاختبارات الشاملة المدمجة |
| `npm run build` | بناء نسخة الإنتاج عبر `next build` |
| `npm run check` | الفحص الكامل المتكامل (Lint + Typecheck + Test + Build) - **إلزامي قبل أي نشر** |
| `npm run printers:update` | تشغيل سكربت تحديث مواصفات الطابعات |
| `npm run printers:content:migration` | توليد ترحيل محتوى صفحات الطابعات |

---

## 12. دليل العمليات المتكررة للمطورين (Developer Operations Guide)

### أ. إضافة أو تعديل منتج جديد:
- **عبر لوحة التحكم (الخيار الموصى به للمحتوى):**
  - ادخل إلى `/admin`، اختر تبويب "المنتجات".
  - أدخل الاسم، الفئة، المواصفات، الصورة، والموديلات ثم اضغط حفظ.
- **برمجياً أو عبر الكود/قاعدة البيانات:**
  - الملف المسؤول: `lib/site-database.ts` (دوال `createProduct`, `updateProduct`).
  - الفئات مدعومة في `app/public-categories.ts` و `app/printer-categories.ts` و `app/laser-inks.ts`.
  - يجب الالتزام بـ Validation المطبق في `app/api/site/validation.ts`.

### ب. رفع أو استبدال الصور:
- الصور ترفع إما من واجهة لوحة التحكم أو عبر استدعاء API الموثق `/api/upload`.
- الحجم الأقصى المسموح به: 4MB (متوافق مع قيود Vercel Functions).
- الأنواع المدعومة: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- مسار الحفظ المولد: `/api/media/{folder}/{uuid}.{ext}`.

### ج. تعديل أسعار أو أرقام التواصل أو ساعات العمل:
- عبر لوحة التحكم: تبويب "بيانات الصفحة" لتعديل الأرقام ومواعيد العمل.
- يتم حفظها في جدول `site_settings` في الحقل `payload`.

### د. تعديل شرائح البانر الرئيسي:
- عبر لوحة التحكم: تبويب "إدارة البانر المتحرك".
- أو برمجياً عبر `app/api/admin/hero-slides` أو جدول `hero_slides` في Supabase.

### هـ. إعادة ترتيب المنتجات في الصفحة الرئيسية:
- عبر لوحة التحكم: تبويب "ترتيب الواجهة الرئيسية".
- يتم حفظ الترتيب عبر دالة `set_home_product_order` الذرية في PostgreSQL.

### و. نشر التحديثات والتراجع (Rollback):
- **النشر:**
  ```bash
  npm run check
  git add <ملفات_محددة>
  git commit -m "وصف واضح للتعديل"
  git push origin main
  ```
- **التراجع عند حدوث طارئ:**
  - عبر لوحة تحكم Vercel: الذهاب إلى Deployments وعمل **Instant Rollback** للنسخة السابقة المستقرة بضغطة زر.
  - أو عبر Git محلياً:
    ```bash
    git revert HEAD
    git push origin main
    ```

---

## 13. المشكلات والمخاطر التقنية الشائعة وكيفية تجنبها

1. **كشف أسرار Supabase:** لا تضع `SUPABASE_SERVICE_ROLE_KEY` في أي كود client أو تبدأه بـ `NEXT_PUBLIC_`.
2. **تجاوز حد الرفع (Payload Limit):** قيود Vercel Serverless تمنع رفع طلبات أكبر من 4.5MB، لذلك تم ضبط حد الصور في الكود عند 4MB. لا ترفع هذا الحد.
3. **تعديل مخطط قاعدة البيانات دون تحديث الكود:** أي إضافة عمود في الجداول يجب أن يواكبها تحديث المقابل في `lib/site-database.ts` و `app/api/site/validation.ts` و `app/site-defaults.ts`.
4. **تسمية العلامة التجارية:** اسم العلامة EPSON موحد إجبارياً بحروف كبيرة عبر دالة `normalizeProductBrandName` للحفاظ على الهوية ومطابقة الاختبارات.
5. **سلامة اللغة العربية:** نصوص الموقع تخضع لعمليات تطبيع للهمزات والأرقام؛ تجنب إدخال أحرف تحكم غير قياسية.
