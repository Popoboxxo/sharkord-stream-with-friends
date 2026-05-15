import { Token } from "../types";

const activeTokens = new Map<string, Token>();

export function generateToken(userId: string, channelId: string): string {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(16));
  const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, "0")).join("");

  const tokenEntry: Token = {
    userId,
    channelId,
    token,
    createdAt: new Date(),
  };

  activeTokens.set(userId, tokenEntry);
  return token;
}

export function validateToken(token: string): boolean {
  for (const entry of activeTokens.values()) {
    if (entry.token === token) {
      return true;
    }
  }
  return false;
}

export function revokeToken(userId: string): void {
  activeTokens.delete(userId);
}

export function getUserToken(userId: string): Token | null {
  return activeTokens.get(userId) ?? null;
}

export function getTokenByValue(token: string): Token | null {
  for (const entry of activeTokens.values()) {
    if (entry.token === token) {
      return entry;
    }
  }
  return null;
}

export function clearAllTokens(): void {
  activeTokens.clear();
}
