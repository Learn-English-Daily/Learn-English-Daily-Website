import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { ObjectId, type WithId } from "mongodb";
import { logoutFinance } from "@/app/finance/actions";
import { FinanceLoginForm } from "@/app/finance/login-form";
import { PaymentRequestActions } from "@/components/admin/payment-request-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FINANCE_ID_COOKIE, FINANCE_SESSION_COOKIE, isValidFinanceSession } from "@/lib/finance-auth";
import { getFinanceEmployeeById } from "@/lib/finance-employees";
import { getMongoDb } from "@/lib/mongodb";
import { getEffectivePaymentAmountDue } from "@/lib/payment-pricing";
import { formatRupiah, getStudentPaymentsCollectionName, type PaymentStatus } from "@/lib/payments";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

type PaymentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  meetingNumber?: number;
  meetingDate?: string;
  amountDue?: number;
  status?: PaymentStatus;
  source?: string;
  paidDate?: string;
  paymentMethod?: string;
  attendanceStatus?: string;
};

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
};

type PaymentRequest = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  meetingNumber: number;
  meetingDate: string;
  amountDue: number;
  status: PaymentStatus;
  paidDate: string;
  paymentMethod: string;
  attendanceStatus: string;
};

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

async function getPaymentRequest(id: string): Promise<PaymentRequest | null> {
  if (!ObjectId.isValid(id)) return null;

  const db = await getMongoDb();
  const payment = (await db
    .collection<PaymentDocument>(getStudentPaymentsCollectionName())
    .findOne({ _id: new ObjectId(id) })) as WithId<PaymentDocument> | null;

  if (!payment?.studentId) return null;

  const student = await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .findOne({ studentId: payment.studentId });

  return {
    id: payment._id.toString(),
    studentId: payment.studentId,
    studentName: student?.studentName || payment.studentName || "Student",
    courseJoined: student?.courseJoined || payment.courseJoined || "",
    classType: student?.classType || payment.classType || "",
    meetingNumber: payment.meetingNumber || 0,
    meetingDate: payment.meetingDate || "",
    amountDue: getEffectivePaymentAmountDue(payment, student),
    status: payment.status || "Unpaid",
    paidDate: payment.paidDate || "",
    paymentMethod: payment.paymentMethod || "",
    attendanceStatus: payment.attendanceStatus || ""
  };
}

export default async function PaymentRequestPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const employeeId = cookieStore.get(FINANCE_ID_COOKIE)?.value || "";
  const session = cookieStore.get(FINANCE_SESSION_COOKIE)?.value || "";
  const employee = employeeId ? await getFinanceEmployeeById(await getMongoDb(), employeeId) : null;
  const isAuthenticated = Boolean(employee?.username && isValidFinanceSession(employee.id, employee.username, session));
  const resolvedParams = await params;

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Finance</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Payment request</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to open this meeting payment request.</p>
          <FinanceLoginForm />
        </Card>
      </main>
    );
  }

  const payment = await getPaymentRequest(resolvedParams.id);
  if (!payment) {
    notFound();
  }

  const receiptNumber = `LEAD-M${String(payment.meetingNumber).padStart(2, "0")}-${payment.id.slice(-6).toUpperCase()}`;
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Button asChild variant="secondary">
          <a href={`/finance/payments?studentId=${encodeURIComponent(payment.studentId)}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </a>
        </Button>
        <form action={logoutFinance}>
          <Button type="submit" variant="secondary">Logout</Button>
        </form>
      </div>

      <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="border-b-4 border-lead-yellow bg-lead-blue px-6 py-6 text-white sm:px-8">
          <div className="flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-lg bg-white p-1">
                <Image src="/images/brand-icon-cropped.png" alt="LEAD" width={48} height={48} className="h-12 w-12 object-contain" />
              </div>
              <div>
                <p className="font-heading text-2xl font-extrabold">LEAD</p>
                <p className="text-sm text-slate-200">Learn English Daily</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Payment Request</p>
              <p className="mt-2 text-sm font-bold">{receiptNumber}</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Payment for</p>
              <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{payment.studentName}</h1>
              <p className="mt-2 text-sm text-lead-gray">{payment.courseJoined} / {payment.classType}</p>
            </div>
            <span className={`w-fit rounded-lg px-4 py-2 text-sm font-bold uppercase ${payment.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-800"}`}>
              {payment.status === "Paid" ? "Paid" : "Payment Due"}
            </span>
          </div>

          <div className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-3">
            <Detail label="Meeting" value={`Meeting ${payment.meetingNumber}`} />
            <Detail label="Class Date" value={formatDate(payment.meetingDate)} />
            <Detail label="Attendance" value={payment.attendanceStatus || "Recorded"} />
          </div>

          <div className="my-6 rounded-lg bg-blue-50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-blue">Amount to be paid</p>
                <p className="mt-2 text-sm text-lead-gray">Payment for this completed class meeting.</p>
              </div>
              <p className="font-heading text-4xl font-extrabold text-lead-navy">{formatRupiah(payment.amountDue)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-5">
            <h2 className="font-heading text-lg font-bold text-lead-navy">Payment note</h2>
            <p className="mt-2 text-sm leading-6 text-lead-gray">
              Please complete the payment for this meeting and send payment confirmation to LEAD via WhatsApp. The admin will update the record after confirmation.
            </p>
          </div>

          {payment.status === "Paid" ? (
            <div className="mt-5 grid gap-3 rounded-lg bg-emerald-50 p-5 text-sm text-emerald-800 sm:grid-cols-2">
              <p><span className="font-bold">Paid date:</span> {payment.paidDate ? formatDate(payment.paidDate) : "Recorded"}</p>
              <p><span className="font-bold">Method:</span> {payment.paymentMethod || "Not set"}</p>
            </div>
          ) : null}

          <div className="mt-8 border-t border-slate-200 pt-5">
            <p className="font-heading font-bold text-lead-navy">LEAD - Learn English Daily</p>
            <p className="mt-1 text-sm text-lead-gray">Speak English with Confidence</p>
            <p className="mt-2 text-sm font-semibold text-lead-blue">Lead@learn-english-daily.com / +62 815-7816-1241</p>
          </div>
        </div>
      </article>

      <div className="mx-auto mt-5 w-full max-w-3xl">
        <PaymentRequestActions
          receipt={{
            receiptNumber,
            studentName: payment.studentName,
            courseJoined: payment.courseJoined,
            classType: payment.classType,
            meetingNumber: payment.meetingNumber,
            meetingDate: formatDate(payment.meetingDate),
            attendanceStatus: payment.attendanceStatus,
            amountDue: formatRupiah(payment.amountDue),
            status: payment.status
          }}
        />
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">{label}</p>
      <p className="mt-2 font-semibold text-lead-navy">{value}</p>
    </div>
  );
}
