import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Coins,
  GraduationCap,
  Landmark,
  LineChart,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldAlert,
  TrendingUp,
  WalletCards
} from "lucide-react";
import { logoutCeo } from "@/app/ceo/actions";
import {
  recordAnnualBudget,
  recordFinanceExpense,
  recordFinanceIncome,
  recordFounderAllowance,
  recordFundMovement,
  recordProfitDistribution,
  recordTeacherPayment
} from "@/app/ceo/finance/actions";
import { FinanceExportButtons } from "@/app/ceo/finance/finance-export-buttons";
import { CeoLoginForm } from "@/app/ceo/login-form";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CEO_SESSION_COOKIE, isCeoConfigured, isValidCeoSession } from "@/lib/ceo-auth";
import {
  financeBranches,
  financeBudgetCategories,
  financeCurrencies,
  financeExpenseCategories,
  financePaymentMethods,
  financePaymentStatuses,
  formatFinanceCurrency,
  founderAllowanceStatuses,
  fundMovementTypes,
  fundTypes,
  getFinanceBudgetsCollectionName,
  getFinanceExpensesCollectionName,
  getFinanceFounderAllowancesCollectionName,
  getFinanceFundMovementsCollectionName,
  getFinanceIncomeCollectionName,
  getFinanceProfitDistributionsCollectionName,
  getFinanceTeacherPaymentsCollectionName,
  profitDistributionStatuses
} from "@/lib/finance";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentPaymentsCollectionName, type PaymentStatus } from "@/lib/payments";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { getTeachersCollectionName, type TeacherDocument } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance Management | LEAD CEO",
  robots: { index: false, follow: false }
};

type ReportPeriod = "month" | "quarter" | "year" | "custom" | "all";

type SearchParams = {
  period?: string | string[];
  start?: string | string[];
  end?: string | string[];
  course?: string | string[];
  teacher?: string | string[];
  branch?: string | string[];
  status?: string | string[];
  category?: string | string[];
};

type StudentPaymentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  meetingNumber?: number;
  meetingDate?: string;
  amountDue?: number;
  status?: PaymentStatus;
  paidDate?: string;
  paymentMethod?: string;
  createdAt?: Date;
};

type FinanceIncomeDocument = {
  student?: string;
  course?: string;
  branch?: string;
  teacher?: string;
  paymentMethod?: string;
  paymentDate?: string;
  amount?: number;
  currency?: string;
  invoiceNumber?: string;
  discount?: number;
  notes?: string;
  status?: string;
  createdAt?: Date;
};

type FinanceExpenseDocument = {
  expenseDate?: string;
  category?: string;
  description?: string;
  amount?: number;
  receiptUrl?: string;
  paidBy?: string;
  approvedBy?: string;
  paymentMethod?: string;
  branch?: string;
  createdAt?: Date;
};

type TeacherPaymentDocument = {
  teacher?: string;
  period?: string;
  classesTaught?: number;
  students?: number;
  salary?: number;
  bonuses?: number;
  adjustments?: number;
  total?: number;
  status?: string;
  createdAt?: Date;
};

type FounderAllowanceDocument = {
  founderName?: string;
  role?: string;
  period?: string;
  allowance?: number;
  status?: string;
  createdAt?: Date;
};

type ProfitDistributionDocument = {
  period?: string;
  monthlyNetProfit?: number;
  retainedProfit?: number;
  distributionAmount?: number;
  founderShare?: string;
  distributionDate?: string;
  approvalStatus?: string;
  createdAt?: Date;
};

type FundMovementDocument = {
  fundType?: string;
  movementType?: string;
  movementDate?: string;
  amount?: number;
  reason?: string;
  createdAt?: Date;
};

type BudgetDocument = {
  year?: number;
  category?: string;
  budgetAmount?: number;
};

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  createdAt?: Date;
};

type NormalizedIncome = {
  id: string;
  student: string;
  course: string;
  branch: string;
  teacher: string;
  paymentMethod: string;
  paymentDate: string;
  amount: number;
  discount: number;
  currency: string;
  invoiceNumber: string;
  status: string;
  source: string;
};

type NormalizedExpense = {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: number;
  receiptUrl: string;
  paidBy: string;
  approvedBy: string;
  paymentMethod: string;
  branch: string;
  source: string;
};

type DateRange = {
  start: string | null;
  end: string | null;
  label: string;
};

const periodOptions: Array<{ value: ReportPeriod; label: string }> = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
  { value: "custom", label: "Custom" },
  { value: "all", label: "All time" }
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function jakartaDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(value);
}

function addMonths(year: number, monthIndex: number, offset: number) {
  const date = new Date(Date.UTC(year, monthIndex + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getDateRange(period: ReportPeriod, customStart = "", customEnd = ""): DateRange {
  const today = jakartaDateKey(new Date());
  const [year, month] = today.split("-").map(Number);

  if (period === "all") return { start: null, end: null, label: "All time" };

  if (period === "custom") {
    return {
      start: customStart || null,
      end: customEnd ? nextDay(customEnd) : null,
      label: customStart || customEnd ? `${customStart || "Start"} to ${customEnd || "Today"}` : "Custom range"
    };
  }

  if (period === "quarter") {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const next = addMonths(year, quarterStartMonth - 1, 3);
    return {
      start: monthStart(year, quarterStartMonth),
      end: monthStart(next.year, next.month),
      label: `Q${Math.floor((month - 1) / 3) + 1} ${year}`
    };
  }

  if (period === "year") {
    return { start: `${year}-01-01`, end: `${year + 1}-01-01`, label: `${year}` };
  }

  const next = addMonths(year, month - 1, 1);
  return { start: monthStart(year, month), end: monthStart(next.year, next.month), label: "This month" };
}

function nextDay(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00+07:00`);
  date.setDate(date.getDate() + 1);
  return jakartaDateKey(date);
}

function inRange(value: string, range: DateRange) {
  if (!value) return false;
  if (range.start && value < range.start) return false;
  if (range.end && value >= range.end) return false;
  return true;
}

function monthKey(value: string) {
  return value ? value.slice(0, 7) : "No date";
}

function formatDate(value?: string | Date) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function branchFromMode(mode = "") {
  return mode === "Offline" ? "Offline Academy" : "Online Academy";
}

function revenueAmount(income: NormalizedIncome) {
  if (income.status === "Refunded") return -income.amount;
  if (income.status === "Paid" || income.status === "Partial") return income.amount;
  return 0;
}

function groupSum<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || "Not set";
    map.set(key, (map.get(key) || 0) + valueFn(item));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

async function getFinanceData(searchParams: SearchParams) {
  const db = await getMongoDb();
  const requestedPeriod = firstParam(searchParams.period);
  const period: ReportPeriod = periodOptions.some((option) => option.value === requestedPeriod) ? (requestedPeriod as ReportPeriod) : "month";
  const range = getDateRange(period, firstParam(searchParams.start), firstParam(searchParams.end));
  const selectedCourse = firstParam(searchParams.course);
  const selectedTeacher = firstParam(searchParams.teacher);
  const selectedBranch = firstParam(searchParams.branch);
  const selectedStatus = firstParam(searchParams.status);
  const selectedCategory = firstParam(searchParams.category);

  const [
    studentPayments,
    manualIncome,
    expenses,
    teacherPayments,
    founderAllowances,
    fundMovements,
    profitDistributions,
    budgets,
    students,
    teachers
  ] = await Promise.all([
    db.collection<StudentPaymentDocument>(getStudentPaymentsCollectionName()).find({}).sort({ meetingDate: -1 }).limit(50000).toArray() as Promise<WithId<StudentPaymentDocument>[]>,
    db.collection<FinanceIncomeDocument>(getFinanceIncomeCollectionName()).find({}).sort({ paymentDate: -1 }).limit(50000).toArray() as Promise<WithId<FinanceIncomeDocument>[]>,
    db.collection<FinanceExpenseDocument>(getFinanceExpensesCollectionName()).find({}).sort({ expenseDate: -1 }).limit(50000).toArray() as Promise<WithId<FinanceExpenseDocument>[]>,
    db.collection<TeacherPaymentDocument>(getFinanceTeacherPaymentsCollectionName()).find({}).sort({ period: -1 }).limit(10000).toArray() as Promise<WithId<TeacherPaymentDocument>[]>,
    db.collection<FounderAllowanceDocument>(getFinanceFounderAllowancesCollectionName()).find({}).sort({ period: -1 }).limit(10000).toArray() as Promise<WithId<FounderAllowanceDocument>[]>,
    db.collection<FundMovementDocument>(getFinanceFundMovementsCollectionName()).find({}).sort({ movementDate: -1 }).limit(10000).toArray() as Promise<WithId<FundMovementDocument>[]>,
    db.collection<ProfitDistributionDocument>(getFinanceProfitDistributionsCollectionName()).find({}).sort({ distributionDate: -1 }).limit(10000).toArray() as Promise<WithId<ProfitDistributionDocument>[]>,
    db.collection<BudgetDocument>(getFinanceBudgetsCollectionName()).find({}).sort({ year: -1 }).limit(1000).toArray() as Promise<WithId<BudgetDocument>[]>,
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).find({}).sort({ createdAt: -1 }).limit(50000).toArray() as Promise<WithId<StudentDocument>[]>,
    db.collection<TeacherDocument>(getTeachersCollectionName()).find({ active: true }).sort({ name: 1 }).toArray()
  ]);

  const existingIncome: NormalizedIncome[] = studentPayments.map((payment) => ({
    id: payment._id.toString(),
    student: payment.studentName || payment.studentId || "Student",
    course: payment.courseJoined || "",
    branch: branchFromMode(payment.classMode),
    teacher: "",
    paymentMethod: payment.paymentMethod || "",
    paymentDate: payment.status === "Paid" ? payment.paidDate || payment.meetingDate || "" : payment.meetingDate || "",
    amount: payment.amountDue || 0,
    discount: 0,
    currency: "IDR",
    invoiceNumber: payment.meetingNumber ? `MEETING-${payment.meetingNumber}` : "",
    status: payment.status === "Paid" ? "Paid" : "Pending",
    source: "Student payment"
  }));
  const manualIncomeRows: NormalizedIncome[] = manualIncome.map((income) => ({
    id: income._id.toString(),
    student: income.student || "Student",
    course: income.course || "",
    branch: income.branch || "Combined LEAD",
    teacher: income.teacher || "",
    paymentMethod: income.paymentMethod || "",
    paymentDate: income.paymentDate || "",
    amount: income.amount || 0,
    discount: income.discount || 0,
    currency: income.currency || "IDR",
    invoiceNumber: income.invoiceNumber || "",
    status: income.status || "Pending",
    source: "Manual income"
  }));
  const allIncome = [...existingIncome, ...manualIncomeRows].filter((income) =>
    inRange(income.paymentDate, range) &&
    (!selectedCourse || income.course === selectedCourse) &&
    (!selectedTeacher || income.teacher === selectedTeacher) &&
    (!selectedBranch || income.branch === selectedBranch) &&
    (!selectedStatus || income.status === selectedStatus)
  );
  const expenseRows: NormalizedExpense[] = expenses.map((expense) => ({
    id: expense._id.toString(),
    expenseDate: expense.expenseDate || "",
    category: expense.category || "Miscellaneous",
    description: expense.description || "",
    amount: expense.amount || 0,
    receiptUrl: expense.receiptUrl || "",
    paidBy: expense.paidBy || "",
    approvedBy: expense.approvedBy || "",
    paymentMethod: expense.paymentMethod || "",
    branch: expense.branch || "Combined LEAD",
    source: "Manual expense"
  })).filter((expense) =>
    inRange(expense.expenseDate, range) &&
    (!selectedBranch || expense.branch === selectedBranch) &&
    (!selectedCategory || expense.category === selectedCategory)
  );
  const paidTeacherPayments = teacherPayments.filter((payment) => payment.status === "Paid" && inRange(`${payment.period || ""}-01`, range));
  const paidFounderAllowances = founderAllowances.filter((allowance) => allowance.status === "Paid" && inRange(`${allowance.period || ""}-01`, range));
  const teacherExpenseTotal = paidTeacherPayments.reduce((sum, payment) => sum + (payment.total || 0), 0);
  const founderAllowanceTotal = paidFounderAllowances.reduce((sum, allowance) => sum + (allowance.allowance || 0), 0);
  const totalRevenue = allIncome.reduce((sum, income) => sum + revenueAmount(income), 0);
  const operatingExpenses = expenseRows.reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = operatingExpenses + teacherExpenseTotal + founderAllowanceTotal;
  const netProfit = totalRevenue - totalExpenses;
  const outstandingPayments =
    allIncome.filter((income) => income.status === "Pending" || income.status === "Partial").reduce((sum, income) => sum + income.amount, 0) +
    studentPayments.filter((payment) => payment.status === "Unpaid").reduce((sum, payment) => sum + (payment.amountDue || 0), 0);
  const fundBalance = (fundType: string) =>
    fundMovements
      .filter((movement) => movement.fundType === fundType)
      .reduce((sum, movement) => sum + (movement.movementType === "Withdrawal" ? -(movement.amount || 0) : movement.amount || 0), 0);
  const emergencyFund = fundBalance("Emergency Fund");
  const growthFund = fundBalance("Business Growth Fund");
  const approvedDistributions = profitDistributions
    .filter((distribution) => distribution.approvalStatus === "Approved" || distribution.approvalStatus === "Paid")
    .reduce((sum, distribution) => sum + (distribution.distributionAmount || 0), 0);
  const leadRetainedProfit = netProfit - approvedDistributions - emergencyFund - growthFund;
  const cashAvailable = totalRevenue - totalExpenses - emergencyFund - growthFund - approvedDistributions;
  const studentGrowth = students.filter((student) => student.createdAt && inRange(jakartaDateKey(new Date(student.createdAt)), range)).length;
  const incomeByMonth = groupSum(allIncome, (income) => monthKey(income.paymentDate), revenueAmount).sort((a, b) => a.name.localeCompare(b.name));
  const expenseByMonth = groupSum(expenseRows, (expense) => monthKey(expense.expenseDate), (expense) => expense.amount).sort((a, b) => a.name.localeCompare(b.name));
  const revenueByCourse = groupSum(allIncome, (income) => income.course || "Not assigned", revenueAmount);
  const revenueByBranch = groupSum(allIncome, (income) => income.branch || "Combined LEAD", revenueAmount);
  const expenseByCategory = groupSum(expenseRows, (expense) => expense.category, (expense) => expense.amount);
  const studentGrowthByMonth = groupSum(
    students.filter((student) => student.createdAt && inRange(jakartaDateKey(new Date(student.createdAt)), range)),
    (student) => monthKey(jakartaDateKey(new Date(student.createdAt || new Date()))),
    () => 1
  ).sort((a, b) => a.name.localeCompare(b.name));
  const profitByMonth = incomeByMonth.map((month) => ({
    name: month.name,
    value: month.value - (expenseByMonth.find((expense) => expense.name === month.name)?.value || 0)
  }));
  const actualSpendingByBudget = groupSum(expenseRows, (expense) => budgetCategoryFromExpense(expense.category), (expense) => expense.amount);
  const budgetRows = budgets.map((budget) => {
    const actual = actualSpendingByBudget.find((item) => item.name === budget.category)?.value || 0;
    const budgetAmount = budget.budgetAmount || 0;
    return {
      year: budget.year || new Date().getFullYear(),
      category: budget.category || "",
      budgetAmount,
      actual,
      difference: budgetAmount - actual,
      remaining: Math.max(0, budgetAmount - actual)
    };
  });
  const courseProfitability = revenueByCourse.map((course) => {
    const teacherCost = course.name ? teacherExpenseTotal / Math.max(revenueByCourse.length, 1) : 0;
    const marketingCost = expenseByCategory.find((item) => item.name === "Marketing")?.value || 0;
    const platformCost = expenseByCategory.filter((item) => ["Platform", "Google Workspace", "Domain", "Internet"].includes(item.name)).reduce((sum, item) => sum + item.value, 0);
    const materialsCost = expenseByCategory.filter((item) => ["Curriculum", "Printing", "Equipment"].includes(item.name)).reduce((sum, item) => sum + item.value, 0);
    const allocatedCost = teacherCost + marketingCost / Math.max(revenueByCourse.length, 1) + platformCost / Math.max(revenueByCourse.length, 1) + materialsCost / Math.max(revenueByCourse.length, 1);
    const profit = course.value - allocatedCost;
    return {
      course: course.name,
      revenue: course.value,
      teacherCost,
      marketingCost: marketingCost / Math.max(revenueByCourse.length, 1),
      platformCost: platformCost / Math.max(revenueByCourse.length, 1),
      materialsCost: materialsCost / Math.max(revenueByCourse.length, 1),
      profit,
      margin: course.value ? Math.round((profit / course.value) * 100) : 0
    };
  });
  const notifications = [
    outstandingPayments > 0 ? `${formatFinanceCurrency(outstandingPayments)} outstanding from students/payment records.` : "",
    budgetRows.some((budget) => budget.difference < 0) ? "One or more budgets are exceeded." : "",
    teacherPayments.some((payment) => payment.status === "Pending") ? "Teacher payment pending." : "",
    emergencyFund < 1000000 ? "Emergency fund is below the suggested threshold." : "",
    "Add Google Workspace and domain renewal dates when available to activate renewal reminders."
  ].filter(Boolean);

  return {
    period,
    range,
    filters: { selectedCourse, selectedTeacher, selectedBranch, selectedStatus, selectedCategory },
    options: {
      courses: [...new Set([...allIncome.map((income) => income.course), ...students.map((student) => student.courseJoined || "")].filter(Boolean))],
      teachers: [...new Set([...teachers.map((teacher) => teacher.name), ...manualIncomeRows.map((income) => income.teacher)].filter(Boolean))]
    },
    kpis: { totalRevenue, totalExpenses, netProfit, outstandingPayments, cashAvailable, emergencyFund, growthFund, leadRetainedProfit, studentGrowth },
    charts: { incomeByMonth, expenseByMonth, profitByMonth, studentGrowthByMonth, revenueByCourse, revenueByBranch, expenseByCategory },
    rows: { income: allIncome, expenses: expenseRows, teacherPayments, founderAllowances, fundMovements, profitDistributions, budgetRows, courseProfitability, notifications }
  };
}

function budgetCategoryFromExpense(category: string) {
  if (category === "Teacher Payments") return "Teacher Budget";
  if (["IT", "Platform", "Google Workspace", "Domain", "Internet"].includes(category)) return "IT Budget";
  if (category === "Marketing") return "Marketing Budget";
  if (["Administration", "Printing"].includes(category)) return "Admin Budget";
  if (category === "Emergency") return "Emergency Budget";
  if (["Equipment", "Procurement"].includes(category)) return "Growth Budget";
  return "Operations Budget";
}

export default async function FinanceManagementPage({
  searchParams
}: {
  searchParams?: Promise<SearchParams>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidCeoSession(cookieStore.get(CEO_SESSION_COOKIE)?.value);
  const resolvedSearchParams = (await searchParams) || {};

  if (!isCeoConfigured()) {
    return (
      <main className="min-h-screen bg-lead-soft px-4 py-10">
        <Card className="mx-auto max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">CEO password missing</h1>
          <p className="mt-4 leading-7 text-lead-gray">Add CEO password environment variables before using finance management.</p>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Finance Management</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to view and manage LEAD finances.</p>
          <CeoLoginForm />
        </Card>
      </main>
    );
  }

  const data = await getFinanceData(resolvedSearchParams);
  const today = jakartaDateKey(new Date());
  const summaryRows = [
    { metric: "Total Revenue", amount: data.kpis.totalRevenue },
    { metric: "Total Expenses", amount: data.kpis.totalExpenses },
    { metric: "Net Profit", amount: data.kpis.netProfit },
    { metric: "Outstanding Payments", amount: data.kpis.outstandingPayments },
    { metric: "Cash Available", amount: data.kpis.cashAvailable },
    { metric: "Emergency Fund", amount: data.kpis.emergencyFund },
    { metric: "Business Growth Fund", amount: data.kpis.growthFund },
    { metric: "LEAD Retained Profit", amount: data.kpis.leadRetainedProfit }
  ];
  const incomeExportRows = data.rows.income.map((income) => ({
    date: income.paymentDate,
    student: income.student,
    course: income.course,
    branch: income.branch,
    teacher: income.teacher,
    method: income.paymentMethod,
    status: income.status,
    amount: income.amount,
    discount: income.discount,
    invoice: income.invoiceNumber,
    source: income.source
  }));
  const expenseExportRows = data.rows.expenses.map((expense) => ({
    date: expense.expenseDate,
    category: expense.category,
    description: expense.description,
    branch: expense.branch,
    method: expense.paymentMethod,
    paidBy: expense.paidBy,
    approvedBy: expense.approvedBy,
    amount: expense.amount,
    receiptUrl: expense.receiptUrl
  }));

  return (
    <main className="min-h-screen bg-lead-soft print:bg-white">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="container-shell flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO Finance</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Finance Management Center</h1>
            <p className="mt-2 text-sm text-lead-gray">Traceable income, expenses, budgets, funds, allowances, and profit approvals for {data.range.label}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary"><a href="/ceo"><ArrowLeft className="h-4 w-4" />CEO Dashboard</a></Button>
            <form action={logoutCeo}><Button type="submit">Logout</Button></form>
          </div>
        </div>
      </header>

      <div className="container-shell grid gap-6 py-8">
        <Card className="p-4 print:hidden">
          <form action="/ceo/finance" className="grid gap-3 lg:grid-cols-5">
            <SelectField label="Report" name="period" defaultValue={data.period} options={periodOptions} />
            <Field label="Start" name="start" type="date" defaultValue={firstParam(resolvedSearchParams.start)} />
            <Field label="End" name="end" type="date" defaultValue={firstParam(resolvedSearchParams.end)} />
            <SelectField label="Course" name="course" defaultValue={data.filters.selectedCourse} options={["", ...data.options.courses].map((course) => ({ label: course || "All courses", value: course }))} />
            <SelectField label="Teacher" name="teacher" defaultValue={data.filters.selectedTeacher} options={["", ...data.options.teachers].map((teacher) => ({ label: teacher || "All teachers", value: teacher }))} />
            <SelectField label="Branch" name="branch" defaultValue={data.filters.selectedBranch} options={["", ...financeBranches].map((branch) => ({ label: branch || "All branches", value: branch }))} />
            <SelectField label="Income Status" name="status" defaultValue={data.filters.selectedStatus} options={["", ...financePaymentStatuses].map((status) => ({ label: status || "All statuses", value: status }))} />
            <SelectField label="Expense Category" name="category" defaultValue={data.filters.selectedCategory} options={["", ...financeExpenseCategories].map((category) => ({ label: category || "All categories", value: category }))} />
            <div className="flex items-end lg:col-span-2"><Button type="submit" className="w-full">Apply Filters</Button></div>
          </form>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-extrabold text-lead-navy">Financial Dashboard</h2>
            <p className="text-sm text-lead-gray">Report range: {data.range.label}</p>
          </div>
          <FinanceExportButtons incomeRows={incomeExportRows} expenseRows={expenseExportRows} summaryRows={summaryRows} />
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={CircleDollarSign} label="Total Revenue" value={formatFinanceCurrency(data.kpis.totalRevenue)} tone="good" />
          <Kpi icon={ReceiptText} label="Total Expenses" value={formatFinanceCurrency(data.kpis.totalExpenses)} tone="danger" />
          <Kpi icon={TrendingUp} label="Net Profit" value={formatFinanceCurrency(data.kpis.netProfit)} tone={data.kpis.netProfit >= 0 ? "good" : "danger"} />
          <Kpi icon={WalletCards} label="Outstanding Payments" value={formatFinanceCurrency(data.kpis.outstandingPayments)} tone="warn" />
          <Kpi icon={Banknote} label="Cash Available" value={formatFinanceCurrency(data.kpis.cashAvailable)} tone={data.kpis.cashAvailable >= 0 ? "good" : "danger"} />
          <Kpi icon={ShieldAlert} label="Emergency Fund" value={formatFinanceCurrency(data.kpis.emergencyFund)} tone="warn" />
          <Kpi icon={PiggyBank} label="Business Growth Fund" value={formatFinanceCurrency(data.kpis.growthFund)} tone="blue" />
          <Kpi icon={Landmark} label="LEAD Retained Profit" value={formatFinanceCurrency(data.kpis.leadRetainedProfit)} tone="blue" />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <ChartCard title="Revenue by Month" icon={BarChart3} rows={data.charts.incomeByMonth} />
          <ChartCard title="Expenses by Month" icon={BarChart3} rows={data.charts.expenseByMonth} />
          <ChartCard title="Profit Trend" icon={LineChart} rows={data.charts.profitByMonth} allowNegative />
          <ChartCard title="Student Growth" icon={GraduationCap} rows={data.charts.studentGrowthByMonth} />
          <ChartCard title="Course Revenue" icon={BriefcaseBusiness} rows={data.charts.revenueByCourse} />
          <ChartCard title="Revenue Split" icon={Building2} rows={data.charts.revenueByBranch} />
          <ChartCard title="Expense Categories" icon={ReceiptText} rows={data.charts.expenseByCategory} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2 print:hidden">
          <EntryCard title="Record Income" action={recordFinanceIncome} successMessage="Income recorded.">
            <Field label="Student" name="student" required />
            <Field label="Course" name="course" placeholder="Foundation English" required />
            <SelectField label="Online / Offline" name="branch" options={financeBranches} required />
            <Field label="Teacher" name="teacher" />
            <SelectField label="Payment Method" name="paymentMethod" options={financePaymentMethods} required />
            <Field label="Payment Date" name="paymentDate" type="date" defaultValue={today} required />
            <Field label="Amount" name="amount" type="number" min={0} required />
            <SelectField label="Currency" name="currency" options={financeCurrencies} defaultValue="IDR" />
            <Field label="Invoice Number" name="invoiceNumber" />
            <Field label="Discount" name="discount" type="number" min={0} />
            <SelectField label="Status" name="status" options={financePaymentStatuses} defaultValue="Paid" required />
            <Field label="Notes" name="notes" />
          </EntryCard>

          <EntryCard title="Record Expense" action={recordFinanceExpense} successMessage="Expense recorded.">
            <Field label="Date" name="expenseDate" type="date" defaultValue={today} required />
            <SelectField label="Category" name="category" options={financeExpenseCategories} required />
            <Field label="Description" name="description" required />
            <Field label="Amount" name="amount" type="number" min={0} required />
            <Field label="Receipt URL" name="receiptUrl" placeholder="Google Drive / receipt link" />
            <Field label="Paid By" name="paidBy" />
            <Field label="Approved By" name="approvedBy" />
            <SelectField label="Payment Method" name="paymentMethod" options={financePaymentMethods} required />
            <SelectField label="Branch" name="branch" options={financeBranches} required />
          </EntryCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2 print:hidden">
          <EntryCard title="Teacher Payment" action={recordTeacherPayment} successMessage="Teacher payment recorded.">
            <Field label="Teacher" name="teacher" required />
            <Field label="Period" name="period" type="month" required />
            <Field label="Classes Taught" name="classesTaught" type="number" min={0} />
            <Field label="Students" name="students" type="number" min={0} />
            <Field label="Salary" name="salary" type="number" min={0} />
            <Field label="Bonuses" name="bonuses" type="number" min={0} />
            <Field label="Adjustments" name="adjustments" type="number" min={0} />
            <SelectField label="Status" name="status" options={financePaymentStatuses} defaultValue="Pending" />
          </EntryCard>

          <EntryCard title="Founder Allowance" action={recordFounderAllowance} successMessage="Founder allowance recorded.">
            <Field label="Founder Name" name="founderName" required />
            <Field label="Role" name="role" required />
            <Field label="Period" name="period" type="month" required />
            <Field label="Allowance" name="allowance" type="number" min={0} required />
            <SelectField label="Status" name="status" options={founderAllowanceStatuses} defaultValue="Pending" />
          </EntryCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-3 print:hidden">
          <EntryCard title="Fund Movement" action={recordFundMovement} successMessage="Fund movement saved.">
            <SelectField label="Fund" name="fundType" options={fundTypes} required />
            <SelectField label="Movement" name="movementType" options={fundMovementTypes} required />
            <Field label="Date" name="movementDate" type="date" defaultValue={today} required />
            <Field label="Amount" name="amount" type="number" min={0} required />
            <Field label="Reason" name="reason" />
          </EntryCard>

          <EntryCard title="Profit Distribution Approval" action={recordProfitDistribution} successMessage="Profit distribution recorded.">
            <Field label="Period" name="period" type="month" required />
            <Field label="Monthly Net Profit" name="monthlyNetProfit" type="number" min={0} />
            <Field label="Business Retained Profit" name="retainedProfit" type="number" min={0} />
            <Field label="Distribution Amount" name="distributionAmount" type="number" min={0} />
            <Field label="Founder Share" name="founderShare" />
            <Field label="Distribution Date" name="distributionDate" type="date" defaultValue={today} required />
            <SelectField label="Approval Status" name="approvalStatus" options={profitDistributionStatuses} defaultValue="Pending Approval" />
          </EntryCard>

          <EntryCard title="Annual Budget" action={recordAnnualBudget} successMessage="Budget saved.">
            <Field label="Year" name="year" type="number" min={2020} max={2100} defaultValue={new Date().getFullYear()} required />
            <SelectField label="Category" name="category" options={financeBudgetCategories} required />
            <Field label="Budget Amount" name="budgetAmount" type="number" min={0} required />
          </EntryCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ReportTable title="Income Management" rows={data.rows.income.slice(0, 25).map((income) => [income.paymentDate, income.student, income.course, income.branch, income.status, formatFinanceCurrency(income.amount)])} headings={["Date", "Student", "Course", "Branch", "Status", "Amount"]} />
          <ReportTable title="Expense Management" rows={data.rows.expenses.slice(0, 25).map((expense) => [expense.expenseDate, expense.category, expense.description, expense.branch, expense.paymentMethod, formatFinanceCurrency(expense.amount)])} headings={["Date", "Category", "Description", "Branch", "Method", "Amount"]} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ReportTable title="Course Profitability" rows={data.rows.courseProfitability.map((course) => [course.course, formatFinanceCurrency(course.revenue), formatFinanceCurrency(course.teacherCost), formatFinanceCurrency(course.marketingCost), formatFinanceCurrency(course.platformCost), formatFinanceCurrency(course.materialsCost), formatFinanceCurrency(course.profit), `${course.margin}%`])} headings={["Course", "Revenue", "Teacher", "Marketing", "Platform", "Materials", "Profit", "Margin"]} />
          <ReportTable title="Budget Performance" rows={data.rows.budgetRows.map((budget) => [String(budget.year), budget.category, formatFinanceCurrency(budget.budgetAmount), formatFinanceCurrency(budget.actual), formatFinanceCurrency(budget.difference), formatFinanceCurrency(budget.remaining)])} headings={["Year", "Category", "Budget", "Actual", "Difference", "Remaining"]} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ReportTable title="Profit Distribution" rows={data.rows.profitDistributions.slice(0, 20).map((distribution) => [distribution.period || "", formatFinanceCurrency(distribution.monthlyNetProfit || 0), formatFinanceCurrency(distribution.retainedProfit || 0), formatFinanceCurrency(distribution.distributionAmount || 0), distribution.founderShare || "", distribution.approvalStatus || ""])} headings={["Period", "Net Profit", "Retained", "Distribution", "Founder Share", "Status"]} />
          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Notifications</h2>
            <div className="mt-4 grid gap-3">
              {data.rows.notifications.map((notification) => (
                <p key={notification} className="rounded-lg bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">{notification}</p>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof CircleDollarSign; label: string; value: string; tone: "good" | "danger" | "warn" | "blue" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "danger" ? "text-rose-600" : tone === "warn" ? "text-yellow-700" : "text-lead-blue";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-lead-gray">{label}</p>
          <p className={`mt-2 font-heading text-2xl font-extrabold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </Card>
  );
}

function ChartCard({ title, icon: Icon, rows, allowNegative = false }: { title: string; icon: typeof BarChart3; rows: Array<{ name: string; value: number }>; allowNegative?: boolean }) {
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-lead-blue" />
        <h2 className="font-heading text-xl font-bold text-lead-navy">{title}</h2>
      </div>
      <div className="mt-5 grid gap-4">
        {rows.slice(0, 8).map((row) => (
          <div key={row.name} className="grid grid-cols-[95px_1fr_auto] items-center gap-3 text-sm">
            <span className="truncate font-semibold text-lead-gray">{row.name}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${allowNegative && row.value < 0 ? "bg-rose-500" : "bg-lead-blue"}`} style={{ width: `${Math.max((Math.abs(row.value) / max) * 100, row.value ? 4 : 0)}%` }} />
            </div>
            <span className="min-w-[90px] text-right font-bold text-lead-navy">{formatFinanceCurrency(row.value)}</span>
          </div>
        ))}
        {!rows.length ? <Empty text="No data for this report." /> : null}
      </div>
    </Card>
  );
}

function EntryCard({ title, action, successMessage, children }: { title: string; action: (formData: FormData) => void | Promise<void>; successMessage: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-lead-blue"><Plus className="h-5 w-5" /></div>
        <h2 className="font-heading text-xl font-bold text-lead-navy">{title}</h2>
      </div>
      <ActionFeedbackForm action={action} successMessage={successMessage} className="mt-5 grid gap-4 sm:grid-cols-2">
        {children}
        <Button type="submit" className="sm:col-span-2">Save Record</Button>
      </ActionFeedbackForm>
    </Card>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy">
      {label}
      <input {...props} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-lead-navy" />
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  name: string;
  options: ReadonlyArray<string> | ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy">
      {label}
      <select {...props} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-lead-navy">
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return <option key={value} value={value}>{optionLabel}</option>;
        })}
      </select>
    </label>
  );
}

function ReportTable({ title, headings, rows }: { title: string; headings: string[]; rows: string[][] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="font-heading text-xl font-bold text-lead-navy">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.1em] text-lead-gray">
            <tr>{headings.map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((cell, cellIndex) => <td key={`${title}-${index}-${cellIndex}`} className="px-4 py-3 text-lead-gray">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <div className="p-5"><Empty text="No records found." /></div> : null}
      </div>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">{text}</p>;
}
