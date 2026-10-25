import { describe, expect, it } from "vitest";
import {
  createShareToken,
  hashShareToken,
  isValidShareTokenFormat,
} from "@/lib/share";

describe("share tokens", () => {
  it("creates unguessable URL-safe tokens and verifies their hash", () => {
    const { token, tokenHash } = createShareToken();
    expect(isValidShareTokenFormat(token)).toBe(true);
    expect(token.length).toBeGreaterThanOrEqual(40);
    expect(tokenHash).toBe(hashShareToken(token));
    expect(tokenHash).toHaveLength(64);
  });

  it("rejects malformed tokens", () => {
    expect(isValidShareTokenFormat("short")).toBe(false);
    expect(isValidShareTokenFormat("<script>alert(1)</script>")).toBe(false);
    expect(isValidShareTokenFormat("a".repeat(43))).toBe(true);
  });

  it("does not store the token itself", () => {
    const { token, tokenHash } = createShareToken();
    expect(tokenHash).not.toContain(token);
  });
});
