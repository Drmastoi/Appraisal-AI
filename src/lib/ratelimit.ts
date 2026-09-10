import { createHash, randomBytes, randomInt } from "node:crypto";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/**
 * Very small in-memory fixed-window limiter. Suitable for a single-node dev
 * deployment; for multi-instance production swap in a shared store (Redis).
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "local";
}

export function generateInviteToken(): string {
  // 20 base-36 chars (~100 bits) — unguessable URLs for anonymous feedback links
  return createHash("sha256")
    .update(randomBytes(32))
    .digest("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24)
    .concat(String(randomInt(100, 999)));
}
