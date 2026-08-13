"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application route error", error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="not-found-page error-page" dir="rtl">
      <div className="not-found-card" role="alert" aria-live="assertive">
        <span aria-hidden="true">!</span>
        <h1>تعذر عرض الصفحة</h1>
        <p>حدث خطأ غير متوقع. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.</p>
        <div className="error-page-actions">
          <button type="button" onClick={reset}>إعادة المحاولة</button>
          <Link href="/">العودة إلى الصفحة الرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
