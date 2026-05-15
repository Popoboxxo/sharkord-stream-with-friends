import { describe, it, expect, beforeEach } from "bun:test";
import {
  generateToken,
  validateToken,
  revokeToken,
  getUserToken,
  getTokenByValue,
  clearAllTokens,
} from "../../src/services/token-service";

describe("token-service", () => {
  beforeEach(() => {
    clearAllTokens();
  });

  describe("generateToken", () => {
    it("should generate a 32-character hex token", () => {
      const token = generateToken("user-1", "channel-1");
      expect(token.length).toBe(32);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it("should store the token for the user", () => {
      const token = generateToken("user-1", "channel-1");
      const stored = getUserToken("user-1");
      expect(stored).not.toBeNull();
      expect(stored!.token).toBe(token);
      expect(stored!.userId).toBe("user-1");
      expect(stored!.channelId).toBe("channel-1");
    });

    it("should overwrite existing token for the same user", () => {
      const token1 = generateToken("user-1", "channel-1");
      const token2 = generateToken("user-1", "channel-2");
      expect(token1).not.toBe(token2);
      expect(getUserToken("user-1")!.token).toBe(token2);
    });
  });

  describe("validateToken", () => {
    it("should return true for a valid token", () => {
      const token = generateToken("user-1", "channel-1");
      expect(validateToken(token)).toBe(true);
    });

    it("should return false for an invalid token", () => {
      generateToken("user-1", "channel-1");
      expect(validateToken("invalid-token")).toBe(false);
    });

    it("should return false after token is revoked", () => {
      const token = generateToken("user-1", "channel-1");
      revokeToken("user-1");
      expect(validateToken(token)).toBe(false);
    });
  });

  describe("revokeToken", () => {
    it("should remove the token for the user", () => {
      generateToken("user-1", "channel-1");
      revokeToken("user-1");
      expect(getUserToken("user-1")).toBeNull();
    });

    it("should not affect other users tokens", () => {
      const token1 = generateToken("user-1", "channel-1");
      const token2 = generateToken("user-2", "channel-1");
      revokeToken("user-1");
      expect(getUserToken("user-1")).toBeNull();
      expect(getUserToken("user-2")!.token).toBe(token2);
    });
  });

  describe("getUserToken", () => {
    it("should return null for unknown user", () => {
      expect(getUserToken("unknown")).toBeNull();
    });

    it("should return the token entry for known user", () => {
      generateToken("user-1", "channel-1");
      const entry = getUserToken("user-1");
      expect(entry).not.toBeNull();
      expect(entry!.userId).toBe("user-1");
    });
  });

  describe("getTokenByValue", () => {
    it("should find token by its value", () => {
      const token = generateToken("user-1", "channel-1");
      const entry = getTokenByValue(token);
      expect(entry).not.toBeNull();
      expect(entry!.userId).toBe("user-1");
    });

    it("should return null for unknown token value", () => {
      generateToken("user-1", "channel-1");
      expect(getTokenByValue("unknown")).toBeNull();
    });
  });
});
