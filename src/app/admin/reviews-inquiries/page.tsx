import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Mail, MessageCircle, Search, Star } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { updateReviewStatus } from "@/app/admin/reviews/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getMongoDb } from "@/lib/mongodb";
import { getReviewCollectionName, type ReviewDisplayOption, type ReviewRole, type ReviewStatus } from "@/lib/reviews";

export const dynamic = "force-dynamic";

type LeadDocument = { name?: string; email?: string; whatsapp?: string; goal?: string; locale?: string; source?: string; createdAt?: Date };
type ReviewDocument = { name?: string; role?: ReviewRole; course?: string; rating?: number; feedback?: string; displayName?: ReviewDisplayOption; locale?: string; status?: ReviewStatus; createdAt?: Date };

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function formatDate(value?: Date) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)) : "Unknown"; }
function statusClass(status: ReviewStatus) { return status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "hidden" ? "bg-slate-100 text-slate-600" : "bg-yellow-50 text-yellow-800"; }

async function getData(view: "inquiries" | "reviews", query: string) {
  const db = await getMongoDb();
  const search = query.trim();
  const leadCollection = db.collection<LeadDocument>(process.env.MONGODB_COLLECTION || "leads");
  const reviewCollection = db.collection<ReviewDocument>(getReviewCollectionName());
  const [inquiryCount, reviewCount, pendingReviewCount] = await Promise.all([
    leadCollection.countDocuments(), reviewCollection.countDocuments(), reviewCollection.countDocuments({ status: "pending" })
  ]);
  if (view === "inquiries") {
    const filter: Filter<LeadDocument> = search ? { $or: ["name", "email", "whatsapp", "goal", "locale", "source"].map((field) => ({ [field]: { $regex: escapeRegex(search), $options: "i" } })) } : {};
    const inquiries = await leadCollection.find(filter).sort({ createdAt: -1 }).limit(100).toArray() as WithId<LeadDocument>[];
    return { inquiryCount, reviewCount, pendingReviewCount, inquiries, reviews: [] as WithId<ReviewDocument>[] };
  }
  const filter: Filter<ReviewDocument> = search ? { $or: ["name", "role", "course", "feedback", "locale", "status", "displayName"].map((field) => ({ [field]: { $regex: escapeRegex(search), $options: "i" } })) } : {};
  const reviews = await reviewCollection.find(filter).sort({ createdAt: -1 }).limit(100).toArray() as WithId<ReviewDocument>[];
  return { inquiryCount, reviewCount, pendingReviewCount, inquiries: [] as WithId<LeadDocument>[], reviews };
}

export default async function ReviewsInquiriesPage({ searchParams }: { searchParams?: Promise<{ view?: string | string[]; q?: string | string[] }> }) {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!isAdminConfigured() || !isValidAdminSession(session)) {
    return <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10"><Card className="w-full max-w-md p-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p><h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Reviews and inquiries</h1><p className="mt-3 text-lead-gray">Sign in with the main admin account to continue.</p><AdminLoginForm /></Card></main>;
  }
  if (isGroupStudentAdminSession(session)) redirect("/admin/batches");
  const params = await searchParams;
  const requestedView = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const view = requestedView === "reviews" ? "reviews" : "inquiries";
  const query = (Array.isArray(params?.q) ? params?.q[0] : params?.q || "").trim();
  const [data, admin] = await Promise.all([getData(view, query), getAuthenticatedAdmin()]);

  return <main className="min-h-screen bg-lead-soft">
    <AdminPageHeader active="feedback" title="Reviews / Inquiries" description="One workspace for prospective-student messages and public testimonial moderation." userName={admin?.name} username={admin?.username} logoutAction={logoutAdmin} />
    <section className="container-shell grid gap-6 py-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <a href="/admin/reviews-inquiries?view=inquiries" className={`focus-ring rounded-xl border p-5 transition ${view === "inquiries" ? "border-lead-blue bg-lead-blue text-white" : "border-blue-100 bg-white text-lead-navy"}`}><p className="text-xs font-bold uppercase tracking-[0.12em] opacity-75">Inquiries</p><p className="mt-1 font-heading text-3xl font-extrabold">{data.inquiryCount}</p><p className="mt-1 text-sm opacity-80">Contact and course-interest submissions</p></a>
        <a href="/admin/reviews-inquiries?view=reviews" className={`focus-ring rounded-xl border p-5 transition ${view === "reviews" ? "border-lead-blue bg-lead-blue text-white" : "border-blue-100 bg-white text-lead-navy"}`}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] opacity-75">Reviews</p><p className="mt-1 font-heading text-3xl font-extrabold">{data.reviewCount}</p><p className="mt-1 text-sm opacity-80">Student and parent testimonials</p></div>{data.pendingReviewCount ? <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-bold text-slate-900">{data.pendingReviewCount} pending</span> : null}</div></a>
      </div>
      <Card className="p-4"><form action="/admin/reviews-inquiries" className="flex flex-col gap-3 md:flex-row"><input type="hidden" name="view" value={view} /><label className="relative flex-1"><span className="sr-only">Search {view}</span><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lead-gray" /><input name="q" defaultValue={query} placeholder={view === "reviews" ? "Search name, course, feedback or status..." : "Search name, email, WhatsApp or message..."} className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm text-lead-navy" /></label><Button type="submit" size="lg"><Search className="h-4 w-4" />Search</Button>{query ? <Button asChild variant="secondary" size="lg"><a href={`/admin/reviews-inquiries?view=${view}`}>Clear</a></Button> : null}</form></Card>

      {view === "inquiries" ? <InquiryList inquiries={data.inquiries} query={query} /> : <ReviewList reviews={data.reviews} query={query} />}
    </section>
  </main>;
}

function InquiryList({ inquiries, query }: { inquiries: WithId<LeadDocument>[]; query: string }) {
  if (!inquiries.length) return <Card className="p-8 text-center text-lead-gray">{query ? "No inquiries match this search." : "No inquiries yet."}</Card>;
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[0.08em] text-lead-gray"><tr><th className="px-5 py-4">Student</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Goal / message</th><th className="px-5 py-4">Locale</th><th className="px-5 py-4">Submitted</th></tr></thead><tbody className="divide-y divide-slate-100">{inquiries.map((lead) => <tr key={lead._id.toString()} className="align-top"><td className="px-5 py-5"><p className="font-heading font-bold text-lead-navy">{lead.name || "Unknown"}</p><p className="mt-1 text-xs text-lead-gray">{lead.source || "website"}</p></td><td className="px-5 py-5"><div className="grid gap-2">{lead.email ? <a className="inline-flex items-center gap-2 font-semibold text-lead-blue" href={`mailto:${lead.email}`}><Mail className="h-4 w-4" />{lead.email}</a> : null}{lead.whatsapp ? <a className="inline-flex items-center gap-2 font-semibold text-emerald-700" href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}><MessageCircle className="h-4 w-4" />{lead.whatsapp}</a> : null}</div></td><td className="max-w-md px-5 py-5 leading-7 text-lead-gray">{lead.goal || "No message"}</td><td className="px-5 py-5 uppercase text-lead-gray">{lead.locale || "en"}</td><td className="px-5 py-5 text-lead-gray">{formatDate(lead.createdAt)}</td></tr>)}</tbody></table></div></div>;
}

function ReviewList({ reviews, query }: { reviews: WithId<ReviewDocument>[]; query: string }) {
  if (!reviews.length) return <Card className="p-8 text-center text-lead-gray">{query ? "No reviews match this search." : "No reviews yet."}</Card>;
  return <div className="grid gap-4">{reviews.map((review) => { const status = review.status || "pending"; return <Card key={review._id.toString()} className="p-5"><div className="grid gap-5 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-heading text-xl font-bold text-lead-navy">{review.name || "Unknown"}</h2><span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">{review.role || "student"}</span><span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClass(status)}`}>{status}</span></div><div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-lead-gray"><span>{review.course || "Course not set"}</span><span>{review.displayName || "full"}</span><span className="uppercase">{review.locale || "en"}</span><span>{formatDate(review.createdAt)}</span></div><div className="mt-4 flex text-lead-yellow">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-4 w-4 ${index < (review.rating || 0) ? "fill-current" : ""}`} />)}</div><p className="mt-4 leading-7 text-lead-gray">{review.feedback || "No feedback"}</p></div><div className="flex flex-wrap items-start gap-2">{(["pending", "approved", "hidden"] as const).map((nextStatus) => <ActionFeedbackForm key={nextStatus} action={updateReviewStatus} successMessage={`Review marked ${nextStatus}.`}><input type="hidden" name="id" value={review._id.toString()} /><input type="hidden" name="status" value={nextStatus} /><Button type="submit" variant={status === nextStatus ? "primary" : "secondary"} size="sm" disabled={status === nextStatus}>{nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}</Button></ActionFeedbackForm>)}</div></div></Card>; })}</div>;
}
