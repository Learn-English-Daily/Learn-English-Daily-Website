"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GAMES_SESSION_COOKIE,
  createGamesSessionToken,
  getGamesPassword
} from "@/lib/games-auth";

function cleanRedirect(value: FormDataEntryValue | null) {
  const redirectTo = typeof value === "string" ? value.trim() : "";
  return redirectTo.startsWith("/games") ? redirectTo : "/games";
}

export async function loginGames(_: unknown, formData: FormData) {
  const password = String(formData.get("password") || "");
  const gamesPassword = getGamesPassword();
  const redirectTo = cleanRedirect(formData.get("redirectTo"));

  if (!gamesPassword) {
    return { error: "Games password is not configured." };
  }

  if (password !== gamesPassword) {
    return { error: "Invalid password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(GAMES_SESSION_COOKIE, createGamesSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/games"
  });

  redirect(redirectTo);
}

export async function logoutGames() {
  const cookieStore = await cookies();
  cookieStore.delete(GAMES_SESSION_COOKIE);
  redirect("/games");
}
