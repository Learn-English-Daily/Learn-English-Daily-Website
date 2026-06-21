"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CEO_SESSION_COOKIE, createCeoSessionToken, getCeoPassword } from "@/lib/ceo-auth";

export async function loginCeo(_: unknown, formData: FormData) {
  const password = String(formData.get("password") || "");
  const ceoPassword = getCeoPassword();

  if (!ceoPassword) {
    return { error: "CEO password is not configured." };
  }

  if (password !== ceoPassword) {
    return { error: "Invalid password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(CEO_SESSION_COOKIE, createCeoSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/ceo"
  });

  redirect("/ceo");
}

export async function logoutCeo() {
  const cookieStore = await cookies();
  cookieStore.delete(CEO_SESSION_COOKIE);
  redirect("/ceo");
}
