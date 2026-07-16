import { cookies } from "next/headers";

export const ADMIN_COOKIE = "eshak_admin_session";

function configuredPassword() {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function configuredSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || configuredPassword();
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sessionToken(password: string) {
  const secret = configuredSessionSecret();
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`eshak-admin:${password}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function passwordIsValid(candidate: string) {
  const password = configuredPassword();
  if (!password || password.length < 8) return false;
  return constantTimeEqual(candidate, password);
}

export async function isAdminSession() {
  const password = configuredPassword();
  if (!password) return false;
  const cookieStore = await cookies();
  const actual = cookieStore.get(ADMIN_COOKIE)?.value ?? "";
  const expected = await sessionToken(password);
  return Boolean(actual && expected && constantTimeEqual(actual, expected));
}

export async function createAdminSessionToken() {
  const password = configuredPassword();
  if (!password) throw new Error("ADMIN_PASSWORD is not configured");
  return sessionToken(password);
}

export async function requireAdminApi() {
  return isAdminSession();
}
