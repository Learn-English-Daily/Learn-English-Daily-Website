"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CEO_SESSION_COOKIE, createCeoSessionToken, createMasterCeoSessionToken, getCeoPassword } from "@/lib/ceo-auth";
import { getMasterEmployeeByUsername, getMasterPassword } from "@/lib/master-auth";
import { recordEmployeeLogin } from "@/lib/employee-login-audit";
import { getMongoDb } from "@/lib/mongodb";
import { normalizeEmployeeUsername } from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginCeo(_: unknown, formData: FormData) {
  const username = normalizeEmployeeUsername(clean(formData.get("username")));
  const password = clean(formData.get("password"));

  if (username) {
    const db = await getMongoDb();
    const master = await getMasterEmployeeByUsername(db, username);

    if (!master) {
      return { error: "Enter a valid master username." };
    }

    const masterPassword = getMasterPassword(master.username);
    if (!masterPassword) {
      return { error: "Master password is not configured yet." };
    }

    if (password !== masterPassword) {
      return { error: "Invalid password." };
    }

    await recordEmployeeLogin(db, master.id, "CEO");

    const cookieStore = await cookies();
    cookieStore.set(CEO_SESSION_COOKIE, createMasterCeoSessionToken(master.id, master.username), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/ceo"
    });

    redirect("/ceo");
  }

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
