import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { Mail, MessageCircle, Search } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type LeadDocument = {
  name?: string;
  email?: string;
  whatsapp?: string;
  goal?: string;
  locale?: string;
  source?: string;
  createdAt?: Date;
};

type Lead = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  goal: string;
  locale: string;
  source: string;
  createdAt: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getLeads(query = ""): Promise<Lead[]> {
  const db = await getMongoDb();
  const collectionName = process.env.MONGODB_COLLECTION || "leads";
  const search = query.trim();
  const filter: Filter<LeadDocument> = search
    ? {
        $or: ["name", "email", "whatsapp", "goal", "locale", "source"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" }
        }))
      }
    : {};
  const docs = (await db.collection<LeadDocument>(collectionName).find(filter).sort({ createdAt: -1 }).limit(100).toArray()) as WithId<LeadDocument>[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name || "Unknown",
    email: doc.email || "",
    whatsapp: doc.whatsapp || "",
    goal: doc.goal || "",
    locale: doc.locale || "en",
    source: doc.source || "website",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : ""
  }));
}

function formatDate(value: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const resolvedSearchParams = await searchParams;
  const searchQuery = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] || "" : resolvedSearchParams?.q || "";

  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen bg-lead-soft px-4 py-10">
        <Card className="mx-auto max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Admin password missing</h1>
          <p className="mt-4 leading-7 text-lead-gray">
            Add <code className="rounded bg-slate-100 px-2 py-1">ADMIN_PASSWORD</code> in Vercel Environment Variables and in
            your local <code className="rounded bg-slate-100 px-2 py-1">.env.local</code> file.
          </p>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">View student inquiries</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to see contact form submissions from MongoDB.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const [leads, admin] = await Promise.all([getLeads(searchQuery), getAuthenticatedAdmin()]);

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="inquiries"
        title="Student inquiries"
        description={
          searchQuery
            ? `Showing ${leads.length} result${leads.length === 1 ? "" : "s"} for "${searchQuery}".`
            : `Showing latest ${leads.length} form submissions.`
        }
        userName={admin?.name}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell py-8">
        <Card className="mb-6 p-4">
          <form action="/admin/inquiries" className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search inquiries</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lead-gray" />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by name, email, WhatsApp, message, locale..."
                className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm text-lead-navy"
              />
            </label>
            <Button type="submit" size="lg">
              <Search className="h-4 w-4" />
              Search
            </Button>
            {searchQuery ? (
              <Button asChild variant="secondary" size="lg">
                <a href="/admin/inquiries">Clear</a>
              </Button>
            ) : null}
          </form>
        </Card>
        {leads.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-lead-gray">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Goal / message</th>
                    <th className="px-5 py-4">Locale</th>
                    <th className="px-5 py-4">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="align-top">
                      <td className="px-5 py-5">
                        <p className="font-heading text-base font-bold text-lead-navy">{lead.name}</p>
                        <p className="mt-1 text-xs text-lead-gray">{lead.source}</p>
                      </td>
                      <td className="px-5 py-5">
                        <div className="grid gap-2">
                          {lead.email ? (
                            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-2 font-semibold text-lead-blue hover:text-blue-700">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </a>
                          ) : null}
                          {lead.whatsapp ? (
                            <a
                              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700"
                            >
                              <MessageCircle className="h-4 w-4" />
                              {lead.whatsapp}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-md px-5 py-5 leading-7 text-lead-gray">{lead.goal}</td>
                      <td className="px-5 py-5">
                        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">{lead.locale}</span>
                      </td>
                      <td className="px-5 py-5 text-lead-gray">{formatDate(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-lead-navy">{searchQuery ? "No matching inquiries" : "No inquiries yet"}</h2>
            <p className="mt-3 text-lead-gray">
              {searchQuery ? "Try a different name, email, WhatsApp number, or message keyword." : "New contact form submissions will appear here."}
            </p>
          </Card>
        )}
      </section>
    </main>
  );
}
