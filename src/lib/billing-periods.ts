import type { Db } from "mongodb";

export type BillingPeriod = {
  billingYear: number;
  billingMonth: number;
  billingPeriod: string;
};

export type ClosedBillingPeriodDocument = BillingPeriod & {
  closedAt?: Date;
  closedBy?: string;
  notes?: string;
  paymentCount?: number;
  paidCount?: number;
  unpaidCount?: number;
  totalPaid?: number;
  totalUnpaid?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export function getClosedBillingPeriodsCollectionName() {
  return process.env.MONGODB_CLOSED_BILLING_PERIODS_COLLECTION || "closed_billing_periods";
}

export function getBillingPeriodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getBillingPeriodFromDate(date = ""): BillingPeriod {
  const [yearValue, monthValue] = date.split("-");
  const billingYear = Number(yearValue);
  const billingMonth = Number(monthValue);

  if (!Number.isInteger(billingYear) || !Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
    return { billingYear: 0, billingMonth: 0, billingPeriod: "" };
  }

  return {
    billingYear,
    billingMonth,
    billingPeriod: getBillingPeriodKey(billingYear, billingMonth)
  };
}

export function getBillingPeriodFromMonthInput(monthInput = ""): BillingPeriod {
  return getBillingPeriodFromDate(`${monthInput}-01`);
}

export function getRecordBillingPeriod(record: { billingYear?: number; billingMonth?: number; meetingDate?: string; paymentDate?: string; sessionDate?: string }) {
  if (record.billingYear && record.billingMonth) {
    return {
      billingYear: record.billingYear,
      billingMonth: record.billingMonth,
      billingPeriod: getBillingPeriodKey(record.billingYear, record.billingMonth)
    };
  }

  return getBillingPeriodFromDate(record.meetingDate || record.paymentDate || record.sessionDate || "");
}

export async function getClosedBillingPeriodKeys(db: Db) {
  const docs = await db
    .collection<ClosedBillingPeriodDocument>(getClosedBillingPeriodsCollectionName())
    .find({})
    .project<{ billingPeriod: string }>({ billingPeriod: 1 })
    .toArray();

  return new Set(docs.map((doc) => doc.billingPeriod).filter(Boolean));
}

export async function isBillingPeriodClosed(db: Db, period: BillingPeriod) {
  if (!period.billingPeriod) return false;
  const record = await db.collection(getClosedBillingPeriodsCollectionName()).findOne({ billingPeriod: period.billingPeriod });
  return Boolean(record);
}
