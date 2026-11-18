import { NextResponse } from "next/server";
import { adminLoginClientKey } from "../../../../lib/admin-login-rate-limit";
import { consumeAdminLoginAttempt } from "../../../../lib/site-database";
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, createAdminSessionToken, hasTrustedAdminOrigin, passwordIsValid } from "../../../admin-auth";

export async function POST(request: Request) {
  if (!hasTrustedAdminOrigin(request)) return new NextResponse("طلب غير صالح", { status: 403 });
  // Reserve before parsing/verifying, so malformed and concurrent attempts also
  // consume the shared allowance. Successful login never resets these counters.
  try {
    const limit = await consumeAdminLoginAttempt(adminLoginClientKey(request));
    if (!limit.allowed) return new NextResponse("محاولات كثيرة، يرجى المحاولة لاحقًا", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse("تسجيل الدخول غير متاح مؤقتًا، يرجى المحاولة لاحقًا", {
      status: 503,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch { return new NextResponse("بيانات تسجيل الدخول غير صالحة", { status: 400 }); }
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
