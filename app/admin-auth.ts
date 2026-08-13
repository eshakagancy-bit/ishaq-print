import { cookies } from "next/headers";
import { ADMIN_SESSION_MAX_AGE_SECONDS, createSignedAdminSessionToken, validateAdminSessionToken } from "./admin-session";

export const ADMIN_COOKIE = "eshak_admin_session";
export const ADMIN_UNAUTHORIZED_MESSAGE = "غير مصرح لك بتنفيذ هذه العملية";
export { ADMIN_SESSION_MAX_AGE_SECONDS };

function localAuthDisabled() {
  return process.env.NODE_ENV !== "production"
    && process.env.ADMIN_AUTH_DISABLED?.trim().toLowerCase() === "true";
}

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

export async function passwordIsValid(candidate: string) {
  const password = configuredPassword();
  if (!password || password.length < 8) return false;
  return constantTimeEqual(candidate, password);
}

export async function isAdminSession() {
  if (localAuthDisabled()) return true;
  const password = configuredPassword();
  if (!password) return false;
  const cookieStore = await cookies();
  const actual = cookieStore.get(ADMIN_COOKIE)?.value ?? "";
  return validateAdminSessionToken(actual, configuredSessionSecret());
}

export async function createAdminSessionToken(now = Date.now()) {
  const password = configuredPassword();
  if (!password) throw new Error("ADMIN_PASSWORD is not configured");
  return createSignedAdminSessionToken(configuredSessionSecret(), now);
}

export function hasTrustedAdminOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol || new URL(request.url).protocol.replace(":", "");
    return originUrl.host === host && originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}

export async function requireAdminApi(request?: Request) {
  if (request && !hasTrustedAdminOrigin(request)) return false;
  return isAdminSession();
}
