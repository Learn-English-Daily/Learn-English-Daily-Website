import { CreditCard, LogOut, WalletCards } from "lucide-react";

export function FinancePageHeader({
  title,
  description,
  employeeName,
  logoutAction
}: {
  title: string;
  description: string;
  employeeName: string;
  logoutAction: () => void | Promise<void>;
}) {
  return (
    <header className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
      <div className="container-shell py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              <WalletCards className="h-4 w-4" />
              LEAD Finance
            </p>
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-lead-navy sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-lead-gray">{description}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Signed in as {employeeName}</p>
          </div>

          <form action={logoutAction} className="lg:pt-2">
            <button
              type="submit"
              className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lead-navy px-5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </div>

        <nav className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Finance navigation">
          <a
            href="/finance/payments"
            aria-current="page"
            className="focus-ring group rounded-2xl border border-lead-blue bg-lead-blue p-4 text-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-white">
              <CreditCard className="h-5 w-5" />
            </span>
            <span className="mt-3 block font-heading text-base font-extrabold">Payments</span>
            <span className="mt-1 block text-xs font-semibold text-blue-100">Fees & receipts</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
