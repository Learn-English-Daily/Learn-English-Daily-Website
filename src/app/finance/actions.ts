"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMongoDb } from "@/lib/mongodb";
import { isRateLimited } from "@/lib/request-security";
import { constantTimeEqual, PORTAL_SESSION_TTL_SECONDS } from "@/lib/auth-security";
import {
  createFinanceSessionToken,
  FINANCE_ID_COOKIE,
  FINANCE_SESSION_COOKIE,
  getFinancePassword
} from "@/lib/finance-auth";
import { getFinanceEmployeeByUsername } from "@/lib/finance-employees";
import { recordEmployeeLogin } from "@/lib/employee-login-audit";
import { normalizeEmployeeUsername } from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginFinance(_: unknown, formData: FormData) {
  const username = normalizeEmployeeUsername(clean(formData.get("username")));
  const password = clean(formData.get("password"));

  if (await isRateLimited(await headers(), "login-finance", 10, 15 * 60 * 1000)) {
    return { error: "Too many login attempts. Try again in 15 minutes." };
  }

  const db = await getMongoDb();
  const employee = await getFinanceEmployeeByUsername(db, username);

  if (!employee) {
    return { error: "Enter a valid active finance employee username." };
  }

  const financePassword = getFinancePassword(employee.username);
  if (!financePassword) {
    return { error: "This finance password is not configured yet." };
  }

  if (!constantTimeEqual(password, financePassword)) {
    return { error: "Invalid password." };
  }

  await recordEmployeeLogin(db, employee.id, "Finance");

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: PORTAL_SESSION_TTL_SECONDS,
    path: "/finance"
  };

  cookieStore.set(FINANCE_ID_COOKIE, employee.id, cookieOptions);
  cookieStore.set(FINANCE_SESSION_COOKIE, createFinanceSessionToken(employee.id, employee.username), cookieOptions);

  redirect("/finance/payments");
}

export async function logoutFinance() {
  const cookieStore = await cookies();
  cookieStore.set(FINANCE_ID_COOKIE, "", { maxAge: 0, path: "/finance" });
  cookieStore.set(FINANCE_SESSION_COOKIE, "", { maxAge: 0, path: "/finance" });
  redirect("/finance");
}
