import type { Db } from "mongodb";
import { getStudentPaymentsCollectionName } from "@/lib/payments";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const groupMonthlyPrices: Record<string, number> = {
  "Foundation English": 200000,
  "Confident English": 250000,
  "Fluent English": 300000
};

let groupInvoiceIndexPromise: Promise<string> | null = null;

async function ensureGroupInvoiceIndex(db: Db) {
  if (!groupInvoiceIndexPromise) {
    groupInvoiceIndexPromise = db.collection(getStudentPaymentsCollectionName()).createIndex(
      { studentId: 1, billingYear: 1, billingMonth: 1, source: 1 },
      { unique: true, partialFilterExpression: { source: "batch-monthly" }, name: "unique_group_monthly_invoice" }
    );
  }
  await groupInvoiceIndexPromise;
}

type GroupStudentInvoiceProfile = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  activeBatchId?: string;
  activeBatchName?: string;
  batchProgram?: string;
};

export function getGroupMonthlyPrice(program: string) {
  return groupMonthlyPrices[program] || 0;
}

export function getCurrentJakartaBillingPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value || 0);
  const month = Number(parts.find((part) => part.type === "month")?.value || 0);
  return { year, month, billingPeriod: `${year}-${String(month).padStart(2, "0")}` };
}

export async function ensureGroupMonthlyInvoice(
  db: Db,
  student: GroupStudentInvoiceProfile,
  period = getCurrentJakartaBillingPeriod()
) {
  if (!student.studentId || student.classType !== "Basic Group") return null;

  const program = student.batchProgram || student.courseJoined || "";
  const amountDue = getGroupMonthlyPrice(program);
  if (!amountDue || !period.year || !period.month) return null;

  await ensureGroupInvoiceIndex(db);

  const payments = db.collection(getStudentPaymentsCollectionName());
  const now = new Date();
  const existing = await payments.findOne({
    studentId: student.studentId,
    billingMonth: period.month,
    billingYear: period.year,
    source: { $in: ["batch-monthly", "batch-assessment"] }
  });

  if (existing) {
    const preservePaidAmount = existing.status === "Paid";
    await payments.updateOne(
      { _id: existing._id },
      {
        $set: {
          studentName: student.studentName || "Student",
          courseJoined: program,
          classType: "Basic Group",
          classMode: student.classMode || "",
          batchId: student.activeBatchId || existing.batchId || "",
          batchName: student.activeBatchName || existing.batchName || "",
          billingMonth: period.month,
          billingYear: period.year,
          billingPeriod: period.billingPeriod,
          includedMeetings: 12,
          attendanceStatus: "Monthly group package - 12 meetings",
          ...(!preservePaidAmount ? { amountDue, source: "batch-monthly" } : {}),
          updatedAt: now
        }
      }
    );
    return existing._id;
  }

  const result = await payments.updateOne(
    { studentId: student.studentId, billingMonth: period.month, billingYear: period.year, source: "batch-monthly" },
    {
      $set: {
        studentName: student.studentName || "Student",
        courseJoined: program,
        classType: "Basic Group",
        classMode: student.classMode || "",
        batchId: student.activeBatchId || "",
        batchName: student.activeBatchName || "",
        billingPeriod: period.billingPeriod,
        includedMeetings: 12,
        amountDue,
        attendanceStatus: "Monthly group package - 12 meetings",
        updatedAt: now
      },
      $setOnInsert: {
        studentId: student.studentId,
        billingMonth: period.month,
        billingYear: period.year,
        meetingNumber: 0,
        meetingDate: `${period.billingPeriod}-01`,
        status: "Unpaid",
        paidDate: "",
        paymentMethod: "",
        notes: "",
        receiptUploadedToDrive: false,
        source: "batch-monthly",
        createdAt: now
      }
    },
    { upsert: true }
  );
  return result.upsertedId;
}

export async function ensureCurrentGroupMonthlyInvoices(db: Db) {
  const students = await db.collection<GroupStudentInvoiceProfile>(getStudentRegistrationCollectionName()).find({
    $and: [
      getActiveStudentFilter(),
      { classType: "Basic Group" },
      { activeBatchId: { $exists: true, $ne: "" } }
    ]
  }).limit(5000).toArray();

  await Promise.all(students.map((student) => ensureGroupMonthlyInvoice(db, student)));
  return students.length;
}
