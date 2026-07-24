import { createHmac, timingSafeEqual } from "crypto";

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

  return createHmac("sha256", secret).update(`lead-games:${password}`).digest("hex");
}

export function isValidGamesSession(value?: string) {
  const expected = createGamesSessionToken();

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
