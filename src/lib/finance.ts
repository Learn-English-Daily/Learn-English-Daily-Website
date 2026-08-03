export const financePaymentStatuses = ["Paid", "Pending", "Partial", "Refunded"] as const;
export const financeExpenseCategories = [
  "Teacher Payments",
  "IT",
  "Administration",
  "Marketing",
  "Platform",
  "Google Workspace",
  "Domain",
  "Internet",
  "Fuel",
  "Transportation",
  "Procurement",
  "Rent",
  "Utilities",
  "Printing",
  "Curriculum",
  "Equipment",
  "Emergency",
  "Miscellaneous"
] as const;
export const financeBudgetCategories = [
  "Teacher Budget",
  "IT Budget",
  "Marketing Budget",
  "Admin Budget",
  "Operations Budget",
  "Emergency Budget",
  "Growth Budget"
] as const;
export const financePaymentMethods = ["Cash", "Bank Transfer", "E-wallet", "Card", "Other"] as const;
export const financeBranches = ["Online Academy", "Offline Academy", "Combined LEAD"] as const;
export const financeCurrencies = ["IDR", "USD", "PKR"] as const;
export const fundTypes = ["Emergency Fund", "Business Growth Fund"] as const;
export const fundMovementTypes = ["Deposit", "Withdrawal"] as const;
export const founderAllowanceStatuses = ["Pending", "Paid"] as const;
export const profitDistributionStatuses = ["Pending Approval", "Approved", "Rejected", "Paid"] as const;

export type FinancePaymentStatus = (typeof financePaymentStatuses)[number];
export type FinanceExpenseCategory = (typeof financeExpenseCategories)[number];
export type FinanceBudgetCategory = (typeof financeBudgetCategories)[number];
export type FinancePaymentMethod = (typeof financePaymentMethods)[number];
export type FinanceBranch = (typeof financeBranches)[number];
export type FundType = (typeof fundTypes)[number];
export type FundMovementType = (typeof fundMovementTypes)[number];
export type FounderAllowanceStatus = (typeof founderAllowanceStatuses)[number];
export type ProfitDistributionStatus = (typeof profitDistributionStatuses)[number];

export function getFinanceIncomeCollectionName() {
  return process.env.MONGODB_FINANCE_INCOME_COLLECTION || "finance_income";
}

export function getFinanceExpensesCollectionName() {
  return process.env.MONGODB_FINANCE_EXPENSES_COLLECTION || "finance_expenses";
}

export function getFinanceTeacherPaymentsCollectionName() {
  return process.env.MONGODB_FINANCE_TEACHER_PAYMENTS_COLLECTION || "finance_teacher_payments";
}

export function getFinanceFounderAllowancesCollectionName() {
  return process.env.MONGODB_FINANCE_FOUNDER_ALLOWANCES_COLLECTION || "finance_founder_allowances";
}

export function getFinanceProfitDistributionsCollectionName() {
  return process.env.MONGODB_FINANCE_PROFIT_DISTRIBUTIONS_COLLECTION || "finance_profit_distributions";
}

export function getFinanceFundMovementsCollectionName() {
  return process.env.MONGODB_FINANCE_FUND_MOVEMENTS_COLLECTION || "finance_fund_movements";
}

export function getFinanceBudgetsCollectionName() {
  return process.env.MONGODB_FINANCE_BUDGETS_COLLECTION || "finance_budgets";
}

export function isFinancePaymentStatus(value: string): value is FinancePaymentStatus {
  return financePaymentStatuses.includes(value as FinancePaymentStatus);
}

export function isFinanceExpenseCategory(value: string): value is FinanceExpenseCategory {
  return financeExpenseCategories.includes(value as FinanceExpenseCategory);
}

export function isFinanceBudgetCategory(value: string): value is FinanceBudgetCategory {
  return financeBudgetCategories.includes(value as FinanceBudgetCategory);
}

export function isFinancePaymentMethod(value: string): value is FinancePaymentMethod {
  return financePaymentMethods.includes(value as FinancePaymentMethod);
}

export function isFinanceBranch(value: string): value is FinanceBranch {
  return financeBranches.includes(value as FinanceBranch);
}

export function isFundType(value: string): value is FundType {
  return fundTypes.includes(value as FundType);
}

export function isFundMovementType(value: string): value is FundMovementType {
  return fundMovementTypes.includes(value as FundMovementType);
}

export function isFounderAllowanceStatus(value: string): value is FounderAllowanceStatus {
  return founderAllowanceStatuses.includes(value as FounderAllowanceStatus);
}

export function isProfitDistributionStatus(value: string): value is ProfitDistributionStatus {
  return profitDistributionStatuses.includes(value as ProfitDistributionStatus);
}

export function formatFinanceCurrency(value: number, currency = "IDR") {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "IDR" ? 0 : 2
  }).format(value);
}
