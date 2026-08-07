import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { WalletCards } from "lucide-react";
import { FinanceLoginForm } from "@/app/finance/login-form";
import { Card } from "@/components/ui/card";
import { FINANCE_ID_COOKIE, FINANCE_SESSION_COOKIE, isValidFinanceSession } from "@/lib/finance-auth";
import { getFinanceEmployeeById } from "@/lib/finance-employees";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance Portal | LEAD",
  robots: { index: false, follow: false }
};

export default async function FinancePage() {
  noStore();
  const cookieStore = await cookies();
  const employeeId = cookieStore.get(FINANCE_ID_COOKIE)?.value || "";
  const session = cookieStore.get(FINANCE_SESSION_COOKIE)?.value || "";
  const employee = employeeId ? await getFinanceEmployeeById(await getMongoDb(), employeeId) : null;

  if (employee?.username && isValidFinanceSession(employee.id, employee.username, session)) {
    redirect("/finance/payments");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
      <Card className="w-full max-w-md p-8 shadow-soft">
        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">
          <WalletCards className="h-4 w-4" />
          LEAD Finance
        </p>
        <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Finance portal</h1>
        <p className="mt-3 leading-7 text-lead-gray">Sign in to manage student payments, receipts, and monthly balance closing.</p>
        <FinanceLoginForm />
      </Card>
    </main>
  );
}
