import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="not-found-page" dir="rtl">
      <div className="not-found-card">
        <span aria-hidden="true">404</span>
        <h1>الصفحة غير موجودة</h1>
        <p>عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها</p>
        <Link href="/">العودة إلى الصفحة الرئيسية</Link>
      </div>
    </main>
  );
}
