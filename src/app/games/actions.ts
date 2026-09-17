"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  GAMES_SESSION_COOKIE,
  createGamesSessionToken,
  getGamesPassword
} from "@/lib/games-auth";
import { constantTimeEqual, PORTAL_SESSION_TTL_SECONDS } from "@/lib/auth-security";
import { isRateLimited } from "@/lib/request-security";

function cleanRedirect(value: FormDataEntryValue | null) {
  const redirectTo = typeof value === "string" ? value.trim() : "";
  return redirectTo.startsWith("/games") ? redirectTo : "/games";
}

export async function loginGames(_: unknown, formData: FormData) {
  const password = String(formData.get("password") || "");
  const gamesPassword = getGamesPassword();
  const redirectTo = cleanRedirect(formData.get("redirectTo"));

  if (await isRateLimited(await headers(), "login-games", 10, 15 * 60 * 1000)) {
    return { error: "Too many login attempts. Try again in 15 minutes." };
  }

  if (!gamesPassword) {
    return { error: "Games password is not configured." };
  }

  if (!constantTimeEqual(password, gamesPassword)) {
    return { error: "Invalid password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(GAMES_SESSION_COOKIE, createGamesSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PORTAL_SESSION_TTL_SECONDS,
    path: "/games"
  });

  redirect(redirectTo);
}

export async function logoutGames() {
  const cookieStore = await cookies();
  cookieStore.set(GAMES_SESSION_COOKIE, "", { maxAge: 0, path: "/games" });
  redirect("/games");
}
