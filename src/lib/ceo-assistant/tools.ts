import type { Db, Document } from "mongodb";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getBatchClassSessionsCollectionName } from "@/lib/batch-class-sessions";
import { getClassSessionsCollectionName } from "@/lib/class-sessions";
import { getAssistantRange, isAssistantPeriod, jakartaToday } from "@/lib/ceo-assistant/date-range";
import type { AssistantDataMode, AssistantPeriod, ToolExecution } from "@/lib/ceo-assistant/types";
import {
  getFinanceExpensesCollectionName,
  getFinanceFounderAllowancesCollectionName,
  getFinanceFundMovementsCollectionName,
  getFinanceIncomeCollectionName,
  getFinanceProfitDistributionsCollectionName,
  getFinanceTeacherPaymentsCollectionName
} from "@/lib/finance";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentPaymentsCollectionName } from "@/lib/payments";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const assistantToolDeclarations = [
  {
    name: "get_business_overview",
    description: "Get a compact, aggregate-only academy overview for a bounded reporting period.",
    parameters: { type: "OBJECT", properties: { period: { type: "STRING", enum: ["this_month", "last_month", "this_quarter", "this_year"] } }, required: ["period"] }
  },
  {
    name: "get_student_statistics",
    description: "Get aggregate active student counts and course distribution. Never returns student names or IDs.",
    parameters: { type: "OBJECT", properties: { period: { type: "STRING", enum: ["this_month", "last_month", "this_quarter", "this_year"] } }, required: ["period"] }
  },
  {
    name: "get_attendance_summary",
    description: "Get aggregate individual and group attendance statistics for a bounded period.",
    parameters: { type: "OBJECT", properties: { period: { type: "STRING", enum: ["this_month", "last_month", "this_quarter", "this_year"] } }, required: ["period"] }
  },
  {
    name: "get_financial_performance",
    description: "Get aggregate revenue, expense, outstanding-payment, fund, and profit figures for a bounded period. Values are IDR.",
    parameters: { type: "OBJECT", properties: { period: { type: "STRING", enum: ["this_month", "last_month", "this_quarter", "this_year"] } }, required: ["period"] }
  },
  {
    name: "get_class_schedule",
    description: "Get aggregate class schedule counts for one date in YYYY-MM-DD format. Never returns names.",
    parameters: { type: "OBJECT", properties: { date: { type: "STRING", description: "A date formatted YYYY-MM-DD" } }, required: ["date"] }
  },
  {
    name: "get_operational_alerts",
    description: "Get aggregate counts of unpaid dues, pending receipts, missing journals, and classes needing attendance.",
    parameters: { type: "OBJECT", properties: { period: { type: "STRING", enum: ["this_month", "last_month", "this_quarter", "this_year"] } }, required: ["period"] }
  }
];

function periodFrom(args: Record<string, unknown>): AssistantPeriod {
  if (!isAssistantPeriod(args.period)) throw new Error("A supported reporting period is required.");
  return args.period;
}

function amount(doc: Document, fields = ["amount", "totalAmount", "amountPaid"]) {
  for (const field of fields) {
    const value = Number(doc[field]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function inRange(doc: Document, start: string, end: string, fields: string[]) {
  return fields.some((field) => {
    const raw = doc[field];
    const value = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw || "").slice(0, 10);
    return value >= start && value <= end;
  });
}

async function students(db: Db, period: AssistantPeriod) {
  const range = getAssistantRange(period);
  const collection = db.collection(getStudentRegistrationCollectionName());
  const [active, newStudents, courses] = await Promise.all([
    collection.countDocuments(getActiveStudentFilter()),
    collection.countDocuments({ ...getActiveStudentFilter(), createdAt: { $gte: new Date(`${range.start}T00:00:00+07:00`), $lte: new Date(`${range.end}T23:59:59+07:00`) } }),
    collection.aggregate<{ _id: string; count: number }>([
      { $match: getActiveStudentFilter() },
      { $group: { _id: { $ifNull: ["$courseJoined", "Not set"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray()
  ]);
  return { reportingPeriod: range, activeStudents: active, newStudents, byCourse: courses.map((row) => ({ course: row._id, count: row.count })) };
}

async function attendance(db: Db, period: AssistantPeriod) {
  const range = getAssistantRange(period);
  const individual = await db.collection(getStudentAttendanceCollectionName()).aggregate<{ _id: string; count: number }>([
    { $match: { meetingDate: { $gte: range.start, $lte: range.end } } },
    { $group: { _id: { $ifNull: ["$status", "Unknown"] }, count: { $sum: 1 } } }
  ]).toArray();
  const groups = await db.collection(getBatchClassSessionsCollectionName()).aggregate<{ _id: string; count: number }>([
    { $match: { sessionDate: { $gte: range.start, $lte: range.end }, attendanceMarked: true } },
    { $unwind: "$attendance" },
    { $group: { _id: { $ifNull: ["$attendance.attendance", "Unknown"] }, count: { $sum: 1 } } }
  ]).toArray();
  const summarize = (rows: { _id: string; count: number }[]) => Object.fromEntries(rows.map((row) => [row._id, row.count]));
  const individualCounts = summarize(individual);
  const groupCounts = summarize(groups);
  const attended = (individualCounts.Present || 0) + (individualCounts.Late || 0) + (groupCounts.Present || 0);
  const total = Object.values(individualCounts).reduce((a, b) => a + b, 0) + Object.values(groupCounts).reduce((a, b) => a + b, 0);
  return { reportingPeriod: range, individual: individualCounts, group: groupCounts, attendanceRatePercent: total ? Math.round((attended / total) * 1000) / 10 : null, records: total };
}

async function finance(db: Db, period: AssistantPeriod) {
  const range = getAssistantRange(period);
  const [studentPayments, income, expenses, teacherPayments, allowances, distributions, funds] = await Promise.all([
    db.collection(getStudentPaymentsCollectionName()).find({ financeExcluded: { $ne: true } }).limit(10000).toArray(),
    db.collection(getFinanceIncomeCollectionName()).find({}).limit(10000).toArray(),
    db.collection(getFinanceExpensesCollectionName()).find({}).limit(10000).toArray(),
    db.collection(getFinanceTeacherPaymentsCollectionName()).find({}).limit(10000).toArray(),
    db.collection(getFinanceFounderAllowancesCollectionName()).find({}).limit(10000).toArray(),
    db.collection(getFinanceProfitDistributionsCollectionName()).find({}).limit(10000).toArray(),
    db.collection(getFinanceFundMovementsCollectionName()).find({}).limit(10000).toArray()
  ]);
  const relevant = (docs: Document[], fields: string[]) => docs.filter((doc) => inRange(doc, range.start, range.end, fields));
  const payments = relevant(studentPayments, ["paymentDate", "meetingDate", "sessionDate", "createdAt"]);
  const paidStudentRevenue = payments.filter((doc) => doc.paymentStatus === "Paid").reduce((sum, doc) => sum + amount(doc, ["amountPaid", "amountDue", "totalAmount", "amount"]), 0);
  const outstanding = payments.filter((doc) => doc.paymentStatus !== "Paid").reduce((sum, doc) => sum + amount(doc, ["amountDue", "totalAmount", "amount"]), 0);
  const manualRevenue = relevant(income, ["paymentDate", "date", "createdAt"]).reduce((sum, doc) => {
    if (doc.status === "Refunded") return sum - amount(doc);
    return doc.status === "Paid" || doc.status === "Partial" ? sum + amount(doc) : sum;
  }, 0);
  const operatingExpenses = relevant(expenses, ["expenseDate", "date", "createdAt"]).reduce((sum, doc) => sum + amount(doc), 0);
  const teacherExpense = relevant(teacherPayments, ["paymentDate", "date", "createdAt"]).filter((doc) => doc.status === "Paid").reduce((sum, doc) => sum + amount(doc), 0);
  const founderAllowance = relevant(allowances, ["paymentDate", "date", "createdAt"]).filter((doc) => doc.status === "Paid").reduce((sum, doc) => sum + amount(doc), 0);
  const approvedDistributions = relevant(distributions, ["distributionDate", "date", "createdAt"]).filter((doc) => doc.status === "Approved" || doc.status === "Paid").reduce((sum, doc) => sum + amount(doc), 0);
  const fundBalances = funds.reduce<Record<string, number>>((totals, doc) => {
    const name = String(doc.fundType || "Other");
    totals[name] = (totals[name] || 0) + (doc.movementType === "Withdrawal" ? -amount(doc) : amount(doc));
    return totals;
  }, {});
  const revenue = paidStudentRevenue + manualRevenue;
  const totalExpenses = operatingExpenses + teacherExpense + founderAllowance;
  return { reportingPeriod: range, currency: "IDR", revenue, paidStudentRevenue, manualRevenue, totalExpenses, operatingExpenses, teacherExpense, founderAllowance, netProfit: revenue - totalExpenses, outstanding, approvedDistributions, fundBalances, basis: "Recorded transactions in the selected period; fund balances are all-time deposits less withdrawals." };
}

async function schedule(db: Db, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must use YYYY-MM-DD.");
  const [individual, groups] = await Promise.all([
    db.collection(getClassSessionsCollectionName()).aggregate<{ _id: string; count: number }>([
      { $match: { sessionDate: date } }, { $group: { _id: { $ifNull: ["$status", "Scheduled"] }, count: { $sum: 1 } } }
    ]).toArray(),
    db.collection(getBatchClassSessionsCollectionName()).aggregate<{ _id: string; count: number }>([
      { $match: { sessionDate: date } }, { $group: { _id: { $ifNull: ["$status", "Scheduled"] }, count: { $sum: 1 } } }
    ]).toArray()
  ]);
  return { date, timezone: "Asia/Jakarta", individual: Object.fromEntries(individual.map((row) => [row._id, row.count])), group: Object.fromEntries(groups.map((row) => [row._id, row.count])) };
}

async function alerts(db: Db, period: AssistantPeriod) {
  const range = getAssistantRange(period);
  const today = jakartaToday();
  const [unpaid, pendingReceipts, missingJournals, individualDue, groupDue] = await Promise.all([
    db.collection(getStudentPaymentsCollectionName()).countDocuments({ financeExcluded: { $ne: true }, paymentStatus: { $ne: "Paid" } }),
    db.collection(getStudentPaymentsCollectionName()).countDocuments({ financeExcluded: { $ne: true }, paymentStatus: "Paid", $or: [{ receiptUrl: { $exists: false } }, { receiptUrl: "" }] }),
    db.collection(getStudentAttendanceCollectionName()).countDocuments({ meetingDate: { $gte: range.start, $lte: range.end }, status: { $in: ["Present", "Late"] }, $or: [{ notes: { $exists: false } }, { notes: "" }] }),
    db.collection(getClassSessionsCollectionName()).countDocuments({ sessionDate: { $lte: today }, status: { $ne: "Completed" }, attendanceId: { $exists: false } }),
    db.collection(getBatchClassSessionsCollectionName()).countDocuments({ sessionDate: { $lte: today }, status: "Scheduled", attendanceMarked: { $ne: true } })
  ]);
  return { reportingPeriod: range, unpaidDues: unpaid, paidReceiptsMissing: pendingReceipts, missingJournals, classesNeedingAttendance: individualDue + groupDue, individualClassesNeedingAttendance: individualDue, groupClassesNeedingAttendance: groupDue };
}

function synthetic(name: string, args: Record<string, unknown>) {
  const period = isAssistantPeriod(args.period) ? args.period : "this_month";
  const range = getAssistantRange(period);
  const common = { source: "synthetic", warning: "Demonstration data only; no production database values were sent to Gemini.", reportingPeriod: range };
  if (name === "get_student_statistics") return { ...common, activeStudents: 42, newStudents: 5, byCourse: [{ course: "Foundation English", count: 18 }, { course: "Confident English", count: 15 }, { course: "Fluent English", count: 9 }] };
  if (name === "get_attendance_summary") return { ...common, individual: { Present: 54, Late: 4, Absent: 6 }, group: { Present: 71, Absent: 8, Excused: 3 }, attendanceRatePercent: 88.4, records: 146 };
  if (name === "get_financial_performance") return { ...common, currency: "IDR", revenue: 24500000, totalExpenses: 15750000, netProfit: 8750000, outstanding: 2100000, basis: "Synthetic demonstration values." };
  if (name === "get_class_schedule") return { ...common, date: typeof args.date === "string" ? args.date : jakartaToday(), individual: { Scheduled: 4, Completed: 3 }, group: { Scheduled: 2, Completed: 1 } };
  if (name === "get_operational_alerts") return { ...common, unpaidDues: 3, paidReceiptsMissing: 1, missingJournals: 2, classesNeedingAttendance: 2 };
  return { ...common, activeStudents: 42, newStudents: 5, attendanceRatePercent: 88.4, revenue: 24500000, totalExpenses: 15750000, netProfit: 8750000, classesNeedingAttendance: 2 };
}

export async function executeAssistantTool(name: string, args: Record<string, unknown>, mode: AssistantDataMode): Promise<ToolExecution> {
  if (!assistantToolDeclarations.some((tool) => tool.name === name)) throw new Error("Unsupported tool request.");
  if (mode === "synthetic") return { name, result: synthetic(name, args) };
  const db = await getMongoDb();
  const period = name === "get_class_schedule" ? "this_month" : periodFrom(args);
  let result: Record<string, unknown>;
  if (name === "get_student_statistics") result = await students(db, period);
  else if (name === "get_attendance_summary") result = await attendance(db, period);
  else if (name === "get_financial_performance") result = await finance(db, period);
  else if (name === "get_class_schedule") result = await schedule(db, String(args.date || ""));
  else if (name === "get_operational_alerts") result = await alerts(db, period);
  else {
    const [studentData, attendanceData, financeData, alertData] = await Promise.all([students(db, period), attendance(db, period), finance(db, period), alerts(db, period)]);
    result = { reportingPeriod: getAssistantRange(period), students: studentData, attendance: attendanceData, finance: financeData, alerts: alertData };
  }
  return { name, result: { ...result, source: "production_aggregates", privacy: "Aggregate-only; no student names or IDs." } };
}
