export const paymentStatuses = ["Unpaid", "Paid"] as const;
export const paymentMethods = ["Cash", "Bank Transfer", "E-wallet", "Other"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
export type PaymentMethod = (typeof paymentMethods)[number];

const perMeetingPrices: Record<string, Record<string, number>> = {
  "Foundation English": {
    "Basic Group": 15000,
    "Standard/Buddy": 45000,
    "Premium 1-to-1": 80000
  },
  "Confident English": {
    "Basic Group": 16000,
    "Standard/Buddy": 50000,
    "Premium 1-to-1": 85000
  },
  "Fluent English": {
    "Basic Group": 17000,
    "Standard/Buddy": 55000,
    "Premium 1-to-1": 90000
  }
};

export function getStudentPaymentsCollectionName() {
  return process.env.MONGODB_STUDENT_PAYMENTS_COLLECTION || "student_payments";
}

export function getSuggestedPerMeetingPrice(courseJoined: string, classType: string) {
  return perMeetingPrices[courseJoined]?.[classType] || 0;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return paymentStatuses.includes(value as PaymentStatus);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod);
}
