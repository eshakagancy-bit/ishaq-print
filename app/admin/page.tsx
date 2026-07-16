import { isAdminSession } from "../admin-auth";
import Link from "next/link";
import AdminDashboard from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!await isAdminSession()) {
    return <main dir="rtl" className="admin-access-page"><div className="admin-access-card"><h1>دخول لوحة التحكم</h1><p>أدخل كلمة مرور المدير للمتابعة.</p><form action="/api/admin/login" method="post"><input name="password" type="password" required minLength={8} placeholder="كلمة المرور" /><button type="submit">تسجيل الدخول</button></form><Link href="/">العودة إلى الموقع</Link></div></main>;
  }

  return <AdminDashboard userName="مدير الموقع" signOutPath="/api/admin/logout" />;
}
