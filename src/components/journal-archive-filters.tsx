"use client";

import { useRef } from "react";
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
  const monthRef = useRef<HTMLSelectElement>(null);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        Student
        <select
          name="studentId"
          defaultValue={selectedStudentId}
          onChange={(event) => {
            if (monthRef.current) monthRef.current.value = "";
            event.currentTarget.form?.requestSubmit();
          }}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-lead-navy"
        >
          {students.map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        Month
        <select
          ref={monthRef}
          name="month"
          defaultValue={selectedMonth}
          className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-lead-navy"
        >
          <option value="">All months</option>
          {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
        </select>
      </label>
      <Button type="submit">Apply Filters</Button>
    </form>
  );
}
