import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, createAdminSessionToken, hasTrustedAdminOrigin, passwordIsValid } from "../../../admin-auth";

export async function POST(request: Request) {
  if (!hasTrustedAdminOrigin(request)) return new NextResponse("طلب غير صالح", { status: 403 });
  const form = await request.formData();
  const unexpectedField = [...form.keys()].find((key) => key !== "password");
  if (unexpectedField) return new NextResponse(`الحقل غير المتوقع: ${unexpectedField}`, { status: 400 });
  if (form.getAll("password").length !== 1) return new NextResponse("بيانات تسجيل الدخول غير صالحة", { status: 400 });
  const passwordValue = form.get("password");
  if (typeof passwordValue !== "string") return new NextResponse("بيانات تسجيل الدخول غير صالحة", { status: 400 });
  const password = passwordValue;
  if (!password || password.length > 1024) return new NextResponse("بيانات تسجيل الدخول غير صالحة", { status: 400 });
  if (!await passwordIsValid(password)) {
    return new NextResponse("كلمة المرور غير صحيحة", { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_COOKIE, await createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
