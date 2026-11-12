"use client";

import { Button } from "@/components/ui/button";

type StudentOption = { id: string; label: string };
type MonthOption = { value: string; label: string };

export function JournalArchiveFilters({
  action,
  students,
  months,
  selectedStudentId,
  selectedMonth
}: {
  action: string;
  students: StudentOption[];
  months: MonthOption[];
  selectedStudentId: string;
  selectedMonth: string;
}) {
  return (
    <form action={action} className="mt-4 grid gap-3">
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        Student
        <select
          name="studentId"
          defaultValue={selectedStudentId}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-lead-navy"
        >
          {students.map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        Month
        <select
          name="month"
          defaultValue={selectedMonth}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-lead-navy"
        >
          <option value="">All months</option>
          {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
        </select>
      </label>
      <p className="text-xs leading-5 text-lead-gray">Choose the student and month, then apply both filters once.</p>
      <Button type="submit">Apply Filters</Button>
    </form>
  );
}
