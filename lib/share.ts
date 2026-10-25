import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createShareToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashShareToken(token) };
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidShareTokenFormat(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}
