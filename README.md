# وكالة إسحاق العالمية — Vercel + Supabase

المشروع يعمل الآن كتطبيق **Next.js أصلي** قابل للنشر على **Vercel**، ويستخدم:

- Supabase PostgreSQL لحفظ إعدادات الموقع والمنتجات والبانر.
- Supabase Storage لحفظ صور الشعار والبانرات والمنتجات.
- Next.js Route Handlers لتأمين عمليات القراءة والإدارة والرفع.
- كلمة مرور وجلسة آمنة للوحة التحكم في `/admin`.

## التشغيل المحلي

1. نفّذ ملف `supabase/setup.sql` مرة واحدة داخل Supabase SQL Editor.
2. انسخ `.env.example` إلى `.env.local` وأدخل القيم الحقيقية.
3. شغّل:

```bash
npm install
npm run dev
```

ثم افتح:

```text
http://localhost:3000
http://localhost:3000/admin
```

## الفحص قبل النشر

```bash
npm run check
```

ينفذ ESLint، وفحص TypeScript، واختبارات الإعداد، ثم `next build`.

## النشر

راجع الدليل العربي الكامل: [VERCEL-SUPABASE-SETUP-AR.md](./VERCEL-SUPABASE-SETUP-AR.md).

## الأمان

- لا تضع `SUPABASE_SERVICE_ROLE_KEY` داخل متغير يبدأ بـ`NEXT_PUBLIC_`.
- لا ترفع `.env.local` إلى GitHub.
- استخدم كلمة مرور قوية وقيمة عشوائية طويلة لـ`ADMIN_SESSION_SECRET`.
- حد الصورة الواحدة 4MB ليتوافق مع حد طلب Vercel Functions.
