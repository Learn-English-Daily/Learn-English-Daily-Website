"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ID_COOKIE, ADMIN_SESSION_COOKIE, createAdminSessionToken, getAdminPassword } from "@/lib/admin-auth";
import { getAdminEmployeeByUsername } from "@/lib/admin-employees";
import { recordEmployeeLogin } from "@/lib/employee-login-audit";
import { getMongoDb } from "@/lib/mongodb";
import { normalizeEmployeeUsername } from "@/lib/teachers";
import { getAdminAccessForUsername } from "@/lib/admin-permissions";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAdmin(_: unknown, formData: FormData) {
  const username = normalizeEmployeeUsername(clean(formData.get("username")));
  const password = clean(formData.get("password"));
  const db = await getMongoDb();
  const admin = await getAdminEmployeeByUsername(db, username);

  if (!admin) {
    return { error: "Enter a valid active admin employee username." };
  }

  const adminPassword = getAdminPassword(admin.username);
  if (!adminPassword) {
    return { error: "This admin password is not configured yet." };
  }

  if (password !== adminPassword) {
    return { error: "Invalid password." };
  }

  await recordEmployeeLogin(db, admin.id, "Admin");

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/admin"
  };

  cookieStore.set(ADMIN_ID_COOKIE, admin.id, cookieOptions);
  cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(admin.id, admin.username), cookieOptions);

  redirect(getAdminAccessForUsername(admin.username) === "group-students" ? "/admin/batches" : "/admin");
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ID_COOKIE);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin");
}
