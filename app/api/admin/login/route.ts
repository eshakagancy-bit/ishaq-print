import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSessionToken, passwordIsValid } from "../../../admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!await passwordIsValid(password)) {
    return new NextResponse("كلمة المرور غير صحيحة", { status: 401, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  const response = NextResponse.redirect(new URL("/admin", request.url), 303);
  response.cookies.set(ADMIN_COOKIE, await createAdminSessionToken(), {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
