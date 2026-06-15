import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft, QrCode, RefreshCcw } from "lucide-react";
import { ObjectId, type WithId } from "mongodb";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { regenerateParentAccessToken } from "@/app/admin/students/actions";
import { ParentPortalTools } from "@/components/admin/parent-portal-tools";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";
import { generateParentAccessToken, getParentPortalUrl, getQrCodeUrl } from "@/lib/parent-access";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

type StudentRegistrationDocument = {
  studentId?: string;
  studentName?: string;
  parentName?: string;
  whatsapp?: string;
  email?: string;
  courseJoined?: string;
  classType?: string;
  parentAccessToken?: string;
  parentAccessTokenUpdatedAt?: Date;
};

type StudentRegistration = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  whatsapp: string;
  email: string;
  courseJoined: string;
  classType: string;
  parentAccessToken: string;
};

async function getStudentWithParentToken(id: string): Promise<StudentRegistration | null> {
  if (!ObjectId.isValid(id)) return null;

  const db = await getMongoDb();
  const collection = db.collection<StudentRegistrationDocument>(getStudentRegistrationCollectionName());
  const objectId = new ObjectId(id);
  let doc = (await collection.findOne({ _id: objectId })) as WithId<StudentRegistrationDocument> | null;

  if (!doc) return null;

  if (!doc.parentAccessToken) {
    const parentAccessToken = generateParentAccessToken();
    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          parentAccessToken,
          parentAccessTokenUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    doc = {
      ...doc,
      parentAccessToken
    };
  }

  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    whatsapp: doc.whatsapp || "",
    email: doc.email || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    parentAccessToken: doc.parentAccessToken || ""
  };
}

export default async function ParentQrPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ regenerated?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const regenerated = Array.isArray(resolvedSearchParams?.regenerated)
    ? resolvedSearchParams?.regenerated[0] === "1"
    : resolvedSearchParams?.regenerated === "1";

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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Parent QR access</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to generate parent attendance QR codes.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const student = await getStudentWithParentToken(resolvedParams.id);
  if (!student) {
    notFound();
  }

  const portalUrl = getParentPortalUrl(student.parentAccessToken);
  const qrCodeUrl = getQrCodeUrl(portalUrl);

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Parent QR access</h1>
            <p className="mt-2 text-sm text-lead-gray">Share this private QR code with the parent to view attendance only.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <a href="/admin/students">
                <ArrowLeft className="h-4 w-4" />
                Back to Registrations
              </a>
            </Button>
            <form action={logoutAdmin}>
              <Button type="submit" variant="primary">Logout</Button>
            </form>
          </div>
        </div>
      </header>

      <section className="container-shell grid gap-6 py-8 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{student.studentId || "No ID"}</span>
            <h2 className="font-heading text-2xl font-bold text-lead-navy">{student.studentName}</h2>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-lead-gray">
            <p><span className="font-bold text-lead-navy">Parent:</span> {student.parentName || "Not set"}</p>
            <p><span className="font-bold text-lead-navy">WhatsApp:</span> {student.whatsapp || "Not set"}</p>
            <p><span className="font-bold text-lead-navy">Email:</span> {student.email || "Not set"}</p>
            <p><span className="font-bold text-lead-navy">Course:</span> {student.courseJoined || "Not set"}</p>
            <p><span className="font-bold text-lead-navy">Class Type:</span> {student.classType || "Not set"}</p>
          </div>
          {regenerated ? (
            <p className="mt-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Parent QR link regenerated.</p>
          ) : null}
          <form action={regenerateParentAccessToken} className="mt-5">
            <input type="hidden" name="id" value={student.id} />
            <Button type="submit" variant="secondary" size="lg">
              <RefreshCcw className="h-4 w-4" />
              Regenerate Private Link
            </Button>
          </form>
          <p className="mt-3 text-xs leading-5 text-lead-gray">
            Regenerate only if the QR/link was shared with the wrong person. The old link will stop working.
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="mx-auto grid h-[300px] w-[300px] place-items-center rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
              <img src={qrCodeUrl} alt={`Parent attendance QR code for ${student.studentName}`} className="h-full w-full" />
            </div>
            <div className="flex-1">
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-lead-blue">
                <QrCode className="h-4 w-4" />
                Parent attendance portal
              </div>
              <h2 className="font-heading text-2xl font-bold text-lead-navy">Send this QR to the parent</h2>
              <p className="mt-3 leading-7 text-lead-gray">
                Parents can scan it anytime to view attendance history. They cannot edit records or access admin pages.
              </p>
              <div className="mt-5">
                <ParentPortalTools portalUrl={portalUrl} qrCodeUrl={qrCodeUrl} />
              </div>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
