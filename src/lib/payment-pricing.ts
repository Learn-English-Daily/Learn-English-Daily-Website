import type { Db } from "mongodb";
import { getStudentPaymentsCollectionName, getSuggestedPerMeetingPrice } from "@/lib/payments";

type StudentPricingProfile = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
};

type PaymentPricingRecord = {
  status?: string;
  source?: string;
  amountDue?: number;
  meetingNumber?: number;
};

export function shouldUseCurrentStudentPrice(payment: PaymentPricingRecord) {
  return payment.status !== "Paid" && payment.source !== "batch-assessment" && Boolean(payment.meetingNumber);
}

export function getEffectivePaymentAmountDue(payment: PaymentPricingRecord, student?: StudentPricingProfile | null) {
  if (!shouldUseCurrentStudentPrice(payment)) return payment.amountDue || 0;

  const currentPrice = getSuggestedPerMeetingPrice(student?.courseJoined || "", student?.classType || "");
  return currentPrice > 0 ? currentPrice : payment.amountDue || 0;
}

export async function refreshUnpaidStudentPaymentPricing(db: Db, student: StudentPricingProfile) {
  if (!student.studentId) return;

  const currentPrice = getSuggestedPerMeetingPrice(student.courseJoined || "", student.classType || "");
  if (currentPrice <= 0) return;

  await db.collection(getStudentPaymentsCollectionName()).updateMany(
    {
      studentId: student.studentId,
      status: { $ne: "Paid" },
      source: { $ne: "batch-assessment" }
    },
    {
      $set: {
        studentName: student.studentName || "Student",
        courseJoined: student.courseJoined || "",
        classType: student.classType || "",
        classMode: student.classMode || "",
        amountDue: currentPrice,
        updatedAt: new Date()
      }
    }
  );
}
