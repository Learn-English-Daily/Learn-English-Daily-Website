import { createExpiringSignature, verifyExpiringSignature } from "@/lib/auth-security";

export const GAMES_SESSION_COOKIE = "lead_games_session";

export function getGamesPassword() {
  return process.env.GAME_PASSWORD || "";
}

export function isGamesPasswordConfigured() {
  return Boolean(getGamesPassword());
}

export function createGamesSessionToken() {
  const password = getGamesPassword();
  const secret = process.env.GAME_SESSION_SECRET || password;

  if (!password || !secret) {
    return "";
  }

  const { expiresAt, signature } = createExpiringSignature(`lead-games:${password}`, secret);
  return `${expiresAt}.${signature}`;
}

export function isValidGamesSession(value?: string) {
  const password = getGamesPassword();
  const secret = process.env.GAME_SESSION_SECRET || password;
  const [expiresAt = "", signature = ""] = (value || "").split(".");
  return Boolean(password && secret && verifyExpiringSignature(`lead-games:${password}`, secret, expiresAt, signature));
}
