import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft } from "lucide-react";
import type { WithId } from "mongodb";
import { logoutFinance } from "@/app/finance/actions";
import { FinanceLoginForm } from "@/app/finance/login-form";
import { CumulativePaymentRequestActions } from "@/components/admin/cumulative-payment-request-actions";
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
  attendanceStatus?: string;
};

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
};

type CumulativePaymentRequest = {
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  totalAmountDue: number;
  payments: Array<{
    id: string;
    meetingNumber: number;
    meetingDate: string;
    amountDue: number;
    attendanceStatus: string;
  }>;
};

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

async function getCumulativePaymentRequest(studentId: string): Promise<CumulativePaymentRequest | null> {
  const db = await getMongoDb();
  const [student, payments] = await Promise.all([
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).findOne({ studentId }),
    db
      .collection<PaymentDocument>(getStudentPaymentsCollectionName())
      .find({ studentId, status: "Unpaid" })
      .sort({ meetingNumber: 1, meetingDate: 1 })
      .limit(200)
      .toArray() as Promise<WithId<PaymentDocument>[]>
  ]);

  if (!student && !payments.length) return null;

  const firstPayment = payments[0];
  return {
    studentId,
    studentName: student?.studentName || firstPayment?.studentName || "Student",
    courseJoined: student?.courseJoined || firstPayment?.courseJoined || "",
    classType: student?.classType || firstPayment?.classType || "",
    totalAmountDue: payments.reduce((sum, payment) => sum + getEffectivePaymentAmountDue(payment, student), 0),
    payments: payments.map((payment) => ({
      id: payment._id.toString(),
      meetingNumber: payment.meetingNumber || 0,
      meetingDate: payment.meetingDate || "",
      amountDue: getEffectivePaymentAmountDue(payment, student),
      attendanceStatus: payment.attendanceStatus || ""
    }))
  };
}

export default async function CumulativePaymentRequestPage({
  params
}: {
  params: Promise<{ studentId: string }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const employeeId = cookieStore.get(FINANCE_ID_COOKIE)?.value || "";
  const session = cookieStore.get(FINANCE_SESSION_COOKIE)?.value || "";
  const employee = employeeId ? await getFinanceEmployeeById(await getMongoDb(), employeeId) : null;
  const isAuthenticated = Boolean(employee?.username && isValidFinanceSession(employee.id, employee.username, session));
  const resolvedParams = await params;
  const studentId = decodeURIComponent(resolvedParams.studentId || "");

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Finance</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Cumulative payment request</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to open this student&apos;s combined payment request.</p>
          <FinanceLoginForm />
        </Card>
      </main>
    );
  }

  const request = await getCumulativePaymentRequest(studentId);
  if (!request) {
    notFound();
  }

  const receiptNumber = `LEAD-CUM-${request.studentId}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const meetingRange = request.payments.length
    ? `Meeting ${request.payments[0].meetingNumber} to Meeting ${request.payments[request.payments.length - 1].meetingNumber}`
    : "No unpaid meetings";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-5 flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Button asChild variant="secondary">
          <a href={`/finance/payments?studentId=${encodeURIComponent(request.studentId)}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Payments
          </a>
        </Button>
        <form action={logoutFinance}>
          <Button type="submit" variant="secondary">Logout</Button>
        </form>
      </div>

      <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft print:max-w-none print:rounded-none print:border-0 print:shadow-none">
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
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Cumulative Payment Request</p>
              <p className="mt-2 text-sm font-bold">{receiptNumber}</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Payment for</p>
              <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{request.studentName}</h1>
              <p className="mt-2 text-sm text-lead-gray">{request.courseJoined} / {request.classType}</p>
            </div>
            <span className="w-fit rounded-lg bg-yellow-50 px-4 py-2 text-sm font-bold uppercase text-yellow-800">
              Payment Due
            </span>
          </div>

          <div className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-3">
            <Detail label="Student ID" value={request.studentId} />
            <Detail label="Meetings included" value={`${request.payments.length} unpaid meetings`} />
            <Detail label="Meeting range" value={meetingRange} />
          </div>

          <div className="my-6 rounded-lg bg-blue-50 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-blue">Total amount to be paid</p>
                <p className="mt-2 text-sm text-lead-gray">Combined payment for all currently unpaid completed class meetings.</p>
              </div>
              <p className="font-heading text-4xl font-extrabold text-lead-navy">{formatRupiah(request.totalAmountDue)}</p>
            </div>
          </div>

          {request.payments.length ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-lead-gray">
                    <tr>
                      <th className="px-4 py-3">Meeting</th>
                      <th className="px-4 py-3">Class date</th>
                      <th className="px-4 py-3">Attendance</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {request.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-4 font-semibold text-lead-navy">Meeting {payment.meetingNumber}</td>
                        <td className="px-4 py-4 text-lead-gray">{formatDate(payment.meetingDate)}</td>
                        <td className="px-4 py-4 text-lead-gray">{payment.attendanceStatus || "Recorded"}</td>
                        <td className="px-4 py-4 text-right font-bold text-lead-navy">{formatRupiah(payment.amountDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-right font-heading text-lg font-bold text-lead-navy">Total</td>
                      <td className="px-4 py-4 text-right font-heading text-lg font-extrabold text-lead-navy">{formatRupiah(request.totalAmountDue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No unpaid payments are currently available for this student.</p>
          )}

          <div className="mt-6 rounded-lg border border-slate-200 p-5">
            <h2 className="font-heading text-lg font-bold text-lead-navy">Payment note</h2>
            <p className="mt-2 text-sm leading-6 text-lead-gray">
              Please complete the total payment for the meetings listed above and send payment confirmation to LEAD via WhatsApp. The admin will update each payment record after confirmation.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-5">
            <p className="font-heading font-bold text-lead-navy">LEAD - Learn English Daily</p>
            <p className="mt-1 text-sm text-lead-gray">Speak English with Confidence</p>
            <p className="mt-2 text-sm font-semibold text-lead-blue">Lead@learn-english-daily.com / +62 815-7816-1241</p>
          </div>
        </div>
      </article>

      <div className="mx-auto mt-5 w-full max-w-4xl">
        <CumulativePaymentRequestActions
          receipt={{
            receiptNumber,
            studentName: request.studentName,
            courseJoined: request.courseJoined,
            classType: request.classType,
            totalAmountDue: formatRupiah(request.totalAmountDue),
            meetingCount: request.payments.length,
            meetings: request.payments.map((payment) => ({
              meetingNumber: payment.meetingNumber,
              meetingDate: formatDate(payment.meetingDate),
              attendanceStatus: payment.attendanceStatus,
              amountDue: formatRupiah(payment.amountDue)
            }))
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
