export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function signSessionPayload(payload: string, secret: string) {
  if (!secret) return "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`eshak-admin:${payload}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function validateAdminSessionToken(token: string, secret: string, now = Date.now()) {
  const [issuedAtValue, nonce, signature, extra] = token.split(".");
  if (!issuedAtValue || !nonce || !signature || extra || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const issuedAt = Number(issuedAtValue);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > ADMIN_SESSION_MAX_AGE_SECONDS * 1000) return false;
  const expected = await signSessionPayload(`${issuedAtValue}.${nonce}`, secret);
  return Boolean(expected && constantTimeEqual(signature, expected));
}

export async function createSignedAdminSessionToken(secret: string, now = Date.now()) {
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const payload = `${now}.${crypto.randomUUID().replaceAll("-", "")}`;
  return `${payload}.${await signSessionPayload(payload, secret)}`;
}
