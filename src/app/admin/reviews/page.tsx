import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Search, Star } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { updateReviewStatus } from "@/app/admin/reviews/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getMongoDb } from "@/lib/mongodb";
import { getReviewCollectionName, type ReviewDisplayOption, type ReviewRole, type ReviewStatus } from "@/lib/reviews";

export const dynamic = "force-dynamic";

type ReviewDocument = {
  name?: string;
  role?: ReviewRole;
  course?: string;
  rating?: number;
  feedback?: string;
  permission?: boolean;
  displayName?: ReviewDisplayOption;
  locale?: string;
  status?: ReviewStatus;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type Review = {
  id: string;
  name: string;
  role: string;
  course: string;
  rating: number;
  feedback: string;
  displayName: string;
  locale: string;
  status: ReviewStatus;
  createdAt: string;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getReviews(query = ""): Promise<Review[]> {
  const db = await getMongoDb();
  const search = query.trim();
  const filter: Filter<ReviewDocument> = search
    ? {
        $or: ["name", "role", "course", "feedback", "locale", "status", "displayName"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" }
        }))
      }
    : {};
  const docs = (await db
    .collection<ReviewDocument>(getReviewCollectionName())
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray()) as WithId<ReviewDocument>[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name || "Unknown",
    role: doc.role || "student",
    course: doc.course || "Unknown",
    rating: doc.rating || 0,
    feedback: doc.feedback || "",
    displayName: doc.displayName || "full",
    locale: doc.locale || "en",
    status: doc.status || "pending",
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

function statusClassName(status: ReviewStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "hidden") return "bg-slate-100 text-slate-600";
  return "bg-yellow-50 text-yellow-800";
}

function statusLabel(status: ReviewStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminReviewsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const isAuthenticated = isValidAdminSession(session);
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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">View student reviews</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to see review submissions from MongoDB.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  if (isGroupStudentAdminSession(session)) redirect("/admin/batches");

  const [reviews, admin] = await Promise.all([getReviews(searchQuery), getAuthenticatedAdmin()]);

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="reviews"
        title="Student and parent reviews"
        description={
          searchQuery
            ? `Showing ${reviews.length} result${reviews.length === 1 ? "" : "s"} for "${searchQuery}".`
            : `Showing latest ${reviews.length} review submissions.`
        }
        userName={admin?.name}
        username={admin?.username}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell py-8">
        <Card className="mb-6 p-4">
          <form action="/admin/reviews" className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search reviews</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lead-gray" />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by name, role, course, feedback, status..."
                className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm text-lead-navy"
              />
            </label>
            <Button type="submit" size="lg">
              <Search className="h-4 w-4" />
              Search
            </Button>
            {searchQuery ? (
              <Button asChild variant="secondary" size="lg">
                <a href="/admin/reviews">Clear</a>
              </Button>
            ) : null}
          </form>
        </Card>

        {reviews.length ? (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-heading text-xl font-bold text-lead-navy">{review.name}</h2>
                      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">{review.role}</span>
                      <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(review.status)}`}>
                        {statusLabel(review.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-lead-gray">
                      <span>{review.course}</span>
                      <span>{review.displayName}</span>
                      <span className="uppercase">{review.locale}</span>
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                    <div className="mt-4 flex text-lead-yellow" aria-label={`${review.rating} star rating`}>
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-current" : ""}`} />
                      ))}
                    </div>
                    <p className="mt-4 leading-7 text-lead-gray">{review.feedback}</p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                    {(["pending", "approved", "hidden"] as const).map((status) => (
                      <ActionFeedbackForm key={status} action={updateReviewStatus} successMessage={`Review marked ${statusLabel(status).toLowerCase()}.`}>
                        <input type="hidden" name="id" value={review.id} />
                        <input type="hidden" name="status" value={status} />
                        <Button
                          type="submit"
                          variant={review.status === status ? "primary" : "secondary"}
                          size="sm"
                          disabled={review.status === status}
                        >
                          {statusLabel(status)}
                        </Button>
                      </ActionFeedbackForm>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-lead-navy">{searchQuery ? "No matching reviews" : "No reviews yet"}</h2>
            <p className="mt-3 text-lead-gray">
              {searchQuery ? "Try a different name, course, status, or feedback keyword." : "New review form submissions will appear here."}
            </p>
          </Card>
        )}
      </section>
    </main>
  );
}
