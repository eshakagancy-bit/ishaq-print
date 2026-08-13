import { NextResponse } from "next/server";
import { ADMIN_COOKIE, hasTrustedAdminOrigin } from "../../../admin-auth";

export async function POST(request: Request) {
  if (!hasTrustedAdminOrigin(request)) return new NextResponse("طلب غير صالح", { status: 403 });
  if ((await request.text()).trim()) return new NextResponse("طلب تسجيل الخروج لا يقبل بيانات", { status: 400 });
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
