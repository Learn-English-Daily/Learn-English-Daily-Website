import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrialStudentsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] || "" : resolvedSearchParams?.q || "";
  const params = new URLSearchParams({ view: "trial" });
  if (searchQuery) params.set("q", searchQuery);
  redirect(`/admin/students?${params.toString()}`);
}
