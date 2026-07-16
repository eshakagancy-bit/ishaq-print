import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "../../../admin-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
