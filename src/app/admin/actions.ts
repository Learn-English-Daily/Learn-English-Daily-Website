"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ID_COOKIE, ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminPassword } from "@/lib/admin-auth";
import { constantTimeEqual, PORTAL_SESSION_TTL_SECONDS } from "@/lib/auth-security";
import { getAdminEmployeeByUsername } from "@/lib/admin-employees";
import { recordEmployeeLogin } from "@/lib/employee-login-audit";
import { getMongoDb } from "@/lib/mongodb";
import { isRateLimited } from "@/lib/request-security";
import { normalizeEmployeeUsername } from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAdmin(_: unknown, formData: FormData) {
  const username = normalizeEmployeeUsername(clean(formData.get("username")));
  const password = clean(formData.get("password"));
  if (await isRateLimited(await headers(), "login-admin", 10, 15 * 60 * 1000)) {
    return { error: "Too many login attempts. Try again in 15 minutes." };
  }
  const db = await getMongoDb();
  const admin = await getAdminEmployeeByUsername(db, username);

  if (!admin) {
    return { error: "Enter a valid active admin employee username." };
  }

  const adminPassword = getAdminPassword(admin.username);
  if (!adminPassword) {
    return { error: "This admin password is not configured yet." };
  }

  if (!constantTimeEqual(password, adminPassword)) {
    return { error: "Invalid password." };
  }

  await recordEmployeeLogin(db, admin.id, "Admin");

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: PORTAL_SESSION_TTL_SECONDS,
    path: "/admin"
  };

  cookieStore.set(ADMIN_ID_COOKIE, admin.id, cookieOptions);
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(admin.id, admin.username), cookieOptions);

  redirect("/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_ID_COOKIE, "", { maxAge: 0, path: "/admin" });
  cookieStore.set(ADMIN_SESSION_COOKIE, "", { maxAge: 0, path: "/admin" });
  redirect("/admin");
}
