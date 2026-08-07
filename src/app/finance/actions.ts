"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMongoDb } from "@/lib/mongodb";
import {
  createFinanceSessionToken,
  FINANCE_ID_COOKIE,
  FINANCE_SESSION_COOKIE,
  getFinancePassword
} from "@/lib/finance-auth";
import { getFinanceEmployeeByUsername } from "@/lib/finance-employees";
import { normalizeEmployeeUsername } from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function loginFinance(_: unknown, formData: FormData) {
  const username = normalizeEmployeeUsername(clean(formData.get("username")));
  const password = clean(formData.get("password"));

  const db = await getMongoDb();
  const employee = await getFinanceEmployeeByUsername(db, username);

  if (!employee) {
    return { error: "Enter a valid active finance employee username." };
  }

  const financePassword = getFinancePassword(employee.username);
  if (!financePassword) {
    return { error: "This finance password is not configured yet." };
  }

  if (password !== financePassword) {
    return { error: "Invalid password." };
  }

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/finance"
  };

  cookieStore.set(FINANCE_ID_COOKIE, employee.id, cookieOptions);
  cookieStore.set(FINANCE_SESSION_COOKIE, createFinanceSessionToken(employee.id, employee.username), cookieOptions);

  redirect("/finance/payments");
}

export async function logoutFinance() {
  const cookieStore = await cookies();
  cookieStore.delete(FINANCE_ID_COOKIE);
  cookieStore.delete(FINANCE_SESSION_COOKIE);
  redirect("/finance");
}
