# إعداد Supabase والنشر على Vercel

## أولًا: تجهيز قاعدة Supabase

1. افتح مشروعك في Supabase.
2. افتح **SQL Editor**.
3. افتح ملف `supabase/setup.sql` من هذا المشروع، وانسخ محتواه كاملًا.
4. الصق المحتوى في SQL Editor واضغط **Run**.

ينشئ الملف الجداول التالية:

- `site_settings`
- `products`
- `hero_slides`
- `hero_settings`

كما ينشئ دالة حفظ ذرية للمنتجات والإعدادات، وينشئ Storage bucket عامًا باسم `site-media`.

## ثانيًا: الحصول على متغيرات Supabase

من إعدادات مشروع Supabase انسخ:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

المفتاح الخادمي سري جدًا. لا تضعه في الكود، ولا تستخدم اسمًا يبدأ بـ`NEXT_PUBLIC_`.

## ثالثًا: الاختبار محليًا

أنشئ ملفًا باسم `.env.local` في جذر المشروع:

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SECRET_KEY
SUPABASE_STORAGE_BUCKET=site-media
ADMIN_PASSWORD=ضع_كلمة_مرور_قوية
ADMIN_SESSION_SECRET=ضع_قيمة_عشوائية_طويلة_ومختلفة
```

ثم نفّذ:

```bash
npm install
npm run check
npm run dev
```

## رابعًا: رفع التعديل إلى GitHub

داخل مجلد المشروع:

```bash
git add .
git commit -m "Migrate deployment to Vercel and Supabase"
git push origin main
```

## خامسًا: إنشاء مشروع Vercel

1. افتح Vercel وسجّل الدخول بواسطة GitHub.
2. اختر **Add New → Project**.
3. اختر مستودع `ishaq-print` ثم **Import**.
4. اترك **Framework Preset** على `Next.js`.
5. Build Command: `npm run build`.
6. لا تضع Output Directory؛ Next.js يديرها تلقائيًا.

## سادسًا: إضافة متغيرات Vercel

قبل الضغط على Deploy أضف القيم التالية إلى Production وPreview:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

بعد إضافة أو تعديل أي متغير، أنشئ Redeploy جديدًا حتى تُطبق القيم على النشر.

## سابعًا: الاختبار بعد النشر

اختبر بالترتيب:

1. الصفحة الرئيسية وتحميل المنتجات.
2. `/admin` وتسجيل الدخول.
3. تعديل نص بسيط ثم حفظه.
4. إضافة أو تعديل شريحة بانر.
5. رفع صورة أقل من 4MB.
6. فتح الموقع في نافذة خاصة والتأكد من ظهور التعديلات.

## ملاحظة مهمة عن البيانات القديمة في D1

هذا الإصدار لا يتصل بقاعدة Cloudflare D1 القديمة. عند أول تشغيل على قاعدة Supabase فارغة، يضيف الموقع الإعدادات والمنتجات الافتراضية الموجودة داخل الكود. أي تعديلات كانت محفوظة فقط داخل D1 تحتاج تصديرًا منفصلًا إذا أردت نقلها حرفيًا.
