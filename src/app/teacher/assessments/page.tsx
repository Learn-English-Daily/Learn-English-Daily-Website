import { redirect } from "next/navigation";

export default async function TeacherAssessmentsPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["assessmentBatchId", "assessmentStudentId", "assessmentMonth", "assessmentYear"]) {
    const value = params?.[key];
    if (value) query.set(key, Array.isArray(value) ? value[0] : value);
  }
  redirect(`/teacher/group-classes?${query.toString()}#monthly-assessment`);
}
