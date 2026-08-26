import assert from "node:assert/strict";
import { createSignedAdminSessionToken } from "../app/admin-session.ts";

export async function seedAdminSession(send, appUrl) {
  const secret = process.env.QA_ADMIN_SESSION_SECRET;
  assert.ok(secret, "QA_ADMIN_SESSION_SECRET is required for local production admin tests");
  const url = new URL(appUrl);
  const value = await createSignedAdminSessionToken(secret);
  await send("Network.enable");
  const result = await send("Network.setCookie", {
    name: "eshak_admin_session",
    value,
    domain: url.hostname,
    path: "/",
    secure: false,
    httpOnly: true,
    sameSite: "Lax",
  });
  assert.notEqual(result?.success, false, "unable to seed local admin session");
}
