import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Simple stateless password-reset token — no DB table, no mail library needed.
// It's an HMAC-signed payload { uid, exp, fp } where `fp` fingerprints the
// user's CURRENT password hash, so once the password changes the token stops
// working (single-use). Tokens also expire after 1 hour.

const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-secret";
const TTL_MS = 1000 * 60 * 60; // 1 hour

const sign = (data: string) =>
  crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
const fingerprint = (passwordHash: string) =>
  crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function createResetToken(userId: string, passwordHash: string): string {
  const payload = { uid: userId, exp: Date.now() + TTL_MS, fp: fingerprint(passwordHash) };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

// Returns the user if the token is valid, unexpired, and not already used.
export async function verifyResetToken(token: string) {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;

  let payload: { uid?: string; exp?: number; fp?: string };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (!payload.uid || typeof payload.exp !== "number" || Date.now() > payload.exp) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user || fingerprint(user.password) !== payload.fp) return null;
  return user;
}
