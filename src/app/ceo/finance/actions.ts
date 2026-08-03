"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { CEO_SESSION_COOKIE, isValidCeoSession } from "@/lib/ceo-auth";
import {
  getFinanceBudgetsCollectionName,
  getFinanceExpensesCollectionName,
  getFinanceFounderAllowancesCollectionName,
  getFinanceFundMovementsCollectionName,
  getFinanceIncomeCollectionName,
  getFinanceProfitDistributionsCollectionName,
  getFinanceTeacherPaymentsCollectionName,
  isFinanceBranch,
  isFinanceBudgetCategory,
  isFinanceExpenseCategory,
  isFinancePaymentMethod,
  isFinancePaymentStatus,
  isFounderAllowanceStatus,
  isFundMovementType,
  isFundType,
  isProfitDistributionStatus
} from "@/lib/finance";
import { getMongoDb } from "@/lib/mongodb";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: unknown) {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

async function assertCeo() {
  const cookieStore = await cookies();
  if (!isValidCeoSession(cookieStore.get(CEO_SESSION_COOKIE)?.value)) {
    throw new Error("Unauthorized");
  }
}

export async function recordFinanceIncome(formData: FormData) {
  await assertCeo();

  const student = clean(formData.get("student"));
  const course = clean(formData.get("course"));
  const branch = clean(formData.get("branch"));
  const teacher = clean(formData.get("teacher"));
  const paymentMethod = clean(formData.get("paymentMethod"));
  const paymentDate = clean(formData.get("paymentDate"));
  const paymentAmount = amount(formData.get("amount"));
  const currency = clean(formData.get("currency")) || "IDR";
  const invoiceNumber = clean(formData.get("invoiceNumber"));
  const discount = amount(formData.get("discount"));
  const notes = clean(formData.get("notes"));
  const status = clean(formData.get("status"));

  if (!student || !course || !paymentDate || paymentAmount <= 0 || !isFinanceBranch(branch) || !isFinancePaymentMethod(paymentMethod) || !isFinancePaymentStatus(status)) {
    throw new Error("Invalid income record");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceIncomeCollectionName()).insertOne({
    student,
    course,
    branch,
    teacher,
    paymentMethod,
    paymentDate,
    amount: paymentAmount,
    currency,
    invoiceNumber,
    discount,
    notes,
    status,
    source: "manual-ceo-finance",
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/ceo/finance");
}

export async function recordFinanceExpense(formData: FormData) {
  await assertCeo();

  const expenseDate = clean(formData.get("expenseDate"));
  const category = clean(formData.get("category"));
  const description = clean(formData.get("description"));
  const expenseAmount = amount(formData.get("amount"));
  const receiptUrl = clean(formData.get("receiptUrl"));
  const paidBy = clean(formData.get("paidBy"));
  const approvedBy = clean(formData.get("approvedBy"));
  const paymentMethod = clean(formData.get("paymentMethod"));
  const branch = clean(formData.get("branch"));

  if (!expenseDate || !description || expenseAmount <= 0 || !isFinanceExpenseCategory(category) || !isFinancePaymentMethod(paymentMethod) || !isFinanceBranch(branch)) {
    throw new Error("Invalid expense record");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceExpensesCollectionName()).insertOne({
    expenseDate,
    category,
    description,
    amount: expenseAmount,
    receiptUrl,
    paidBy,
    approvedBy,
    paymentMethod,
    branch,
    source: "manual-ceo-finance",
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/ceo/finance");
}

export async function recordTeacherPayment(formData: FormData) {
  await assertCeo();

  const teacher = clean(formData.get("teacher"));
  const period = clean(formData.get("period"));
  const classesTaught = amount(formData.get("classesTaught"));
  const students = amount(formData.get("students"));
  const salary = amount(formData.get("salary"));
  const bonuses = amount(formData.get("bonuses"));
  const adjustments = amount(formData.get("adjustments"));
  const status = clean(formData.get("status"));

  if (!teacher || !period || !isFinancePaymentStatus(status)) {
    throw new Error("Invalid teacher payment");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceTeacherPaymentsCollectionName()).insertOne({
    teacher,
    period,
    classesTaught,
    students,
    salary,
    bonuses,
    adjustments,
    total: salary + bonuses + adjustments,
    status,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/ceo/finance");
}

export async function recordFounderAllowance(formData: FormData) {
  await assertCeo();

  const founderName = clean(formData.get("founderName"));
  const role = clean(formData.get("role"));
  const period = clean(formData.get("period"));
  const allowance = amount(formData.get("allowance"));
  const status = clean(formData.get("status"));

  if (!founderName || !role || !period || allowance <= 0 || !isFounderAllowanceStatus(status)) {
    throw new Error("Invalid founder allowance");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceFounderAllowancesCollectionName()).insertOne({
    founderName,
    role,
    period,
    allowance,
    status,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/ceo/finance");
}

export async function recordFundMovement(formData: FormData) {
  await assertCeo();

  const fundType = clean(formData.get("fundType"));
  const movementType = clean(formData.get("movementType"));
  const movementDate = clean(formData.get("movementDate"));
  const movementAmount = amount(formData.get("amount"));
  const reason = clean(formData.get("reason"));

  if (!movementDate || movementAmount <= 0 || !isFundType(fundType) || !isFundMovementType(movementType)) {
    throw new Error("Invalid fund movement");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceFundMovementsCollectionName()).insertOne({
    fundType,
    movementType,
    movementDate,
    amount: movementAmount,
    reason,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/ceo/finance");
}

export async function recordProfitDistribution(formData: FormData) {
  await assertCeo();

  const period = clean(formData.get("period"));
  const monthlyNetProfit = amount(formData.get("monthlyNetProfit"));
  const retainedProfit = amount(formData.get("retainedProfit"));
  const distributionAmount = amount(formData.get("distributionAmount"));
  const founderShare = clean(formData.get("founderShare"));
  const distributionDate = clean(formData.get("distributionDate"));
  const approvalStatus = clean(formData.get("approvalStatus"));

  if (!period || !distributionDate || !isProfitDistributionStatus(approvalStatus)) {
    throw new Error("Invalid profit distribution");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceProfitDistributionsCollectionName()).insertOne({
    period,
    monthlyNetProfit,
    retainedProfit,
    distributionAmount,
    founderShare,
    distributionDate,
    approvalStatus,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/ceo/finance");
}

export async function recordAnnualBudget(formData: FormData) {
  await assertCeo();

  const year = Number(clean(formData.get("year")));
  const category = clean(formData.get("category"));
  const budgetAmount = amount(formData.get("budgetAmount"));

  if (!Number.isInteger(year) || year < 2020 || year > 2100 || budgetAmount <= 0 || !isFinanceBudgetCategory(category)) {
    throw new Error("Invalid budget");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getFinanceBudgetsCollectionName()).updateOne(
    { year, category },
    {
      $set: {
        year,
        category,
        budgetAmount,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  revalidatePath("/ceo/finance");
}
