import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Trust only Vercel's ingress-injected header, and only on Vercel. Never use
// x-forwarded-for, x-real-ip, cookies or user-agent as a fallback identity.
export function adminLoginClientKey(request: Request, environment = process.env) {
  const secret = environment.ADMIN_SESSION_SECRET?.trim() || environment.ADMIN_PASSWORD?.trim();
  if (!secret) throw new Error("Login rate limiter is unavailable");
  const rawIp = environment.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for")?.trim() : undefined;
  let identity = "untrusted-client";
  if (rawIp && isIP(rawIp) === 4) identity = rawIp;
  if (rawIp && isIP(rawIp) === 6) {
    const canonical = new URL(`http://[${rawIp}]/`).hostname.slice(1, -1);
    const [left, right = ""] = canonical.split("::");
    const start = left ? left.split(":") : [];
    const end = right ? right.split(":") : [];
    const groups = canonical.includes("::")
      ? [...start, ...Array<string>(8 - start.length - end.length).fill("0"), ...end]
      : start;
    // Group IPv6 privacy addresses by /64 so rotating the interface id cannot
    // reset the allowance. IPv4-mapped IPv6 addresses share a conservative bucket.
    identity = `${groups.slice(0, 4).map((group) => group.padStart(4, "0")).join(":")}/64`;
  }
  return createHmac("sha256", secret).update(`admin-login-v1:${identity}`).digest("hex");
}
