import {
  CalendarCheck,
  CalendarClock,
  Gauge,
  Inbox,
  MessageSquareText,
  Star,
  Users
} from "lucide-react";

type AdminPageKey = "dashboard" | "inquiries" | "sessions" | "attendance" | "students" | "batches" | "reviews";

const adminNavItems: Array<{
  key: AdminPageKey;
  label: string;
  href: string;
  helper: string;
  icon: typeof Inbox;
}> = [
  { key: "dashboard", label: "Dashboard", href: "/admin", helper: "Daily overview", icon: Gauge },
  { key: "inquiries", label: "Inquiries", href: "/admin/inquiries", helper: "New leads", icon: Inbox },
  { key: "sessions", label: "Sessions", href: "/admin/sessions", helper: "Class schedule", icon: CalendarClock },
  { key: "attendance", label: "Attendance", href: "/admin/attendance", helper: "Meeting records", icon: CalendarCheck },
  { key: "students", label: "Students", href: "/admin/students", helper: "Registrations", icon: Users },
  { key: "reviews", label: "Reviews", href: "/admin/reviews", helper: "Testimonials", icon: Star }
];

export function AdminPageHeader({
  active,
  title,
  description,
  userName,
  logoutAction
}: {
  active: AdminPageKey;
  title: string;
  description: string;
  userName?: string;
  logoutAction: () => void | Promise<void>;
}) {
  return (
    <header className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
      <div className="container-shell py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              <MessageSquareText className="h-4 w-4" />
              LEAD Admin
            </p>
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-lead-navy sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-lead-gray">{description}</p>
            {userName ? <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Signed in as {userName}</p> : null}
          </div>

          <form action={logoutAction} className="lg:pt-2">
            <button
              type="submit"
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg bg-lead-navy px-5 text-sm font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-900"
            >
              Logout
            </button>
          </form>
        </div>

        <nav className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Admin navigation">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;

            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`focus-ring group rounded-2xl border p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-soft ${
                  isActive
                    ? "border-lead-blue bg-lead-blue text-white"
                    : "border-white/80 bg-white/90 text-lead-navy hover:border-blue-100"
                }`}
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    isActive ? "bg-white/20 text-white" : "bg-blue-50 text-lead-blue group-hover:bg-blue-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-3 block font-heading text-base font-extrabold">{item.label}</span>
                <span className={`mt-1 block text-xs font-semibold ${isActive ? "text-blue-100" : "text-lead-gray"}`}>
                  {item.helper}
                </span>
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
