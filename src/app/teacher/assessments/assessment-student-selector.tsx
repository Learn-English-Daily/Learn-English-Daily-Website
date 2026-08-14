"use client";

import { useRouter } from "next/navigation";

type BatchOption = {
  id: string;
  batchName: string;
  program: string;
  days: string;
  time: string;
  students: Array<{
    studentId: string;
    studentName: string;
    assessmentStatus: string;
    overallGrade: "A" | "B" | "C" | "";
  }>;
};

export function AssessmentStudentSelector({
  batches,
  selectedBatchId,
  selectedStudentId
}: {
  batches: BatchOption[];
  selectedBatchId: string;
  selectedStudentId: string;
}) {
  const router = useRouter();
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId);

  function openBatch(batchId: string) {
    const query = new URLSearchParams({
      assessmentBatchId: batchId
    });
    router.push(`/teacher/assessments?${query.toString()}`);
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:sticky lg:top-5 lg:h-fit">
      <label className="grid gap-2 text-sm font-bold text-lead-navy">
        Select Batch
        <select
          value={selectedBatchId}
          onChange={(event) => openBatch(event.target.value)}
          className="focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-lead-navy"
        >
          {!batches.length ? <option value="">No assigned batches</option> : null}
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>{batch.batchName}</option>
          ))}
        </select>
      </label>

      {selectedBatch ? (
        <div className="mt-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="font-heading font-bold text-lead-navy">{selectedBatch.program}</p>
            <p className="mt-1 text-xs leading-5 text-lead-gray">{selectedBatch.days} / {selectedBatch.time}</p>
          </div>
          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Students</p>
          <div className="grid max-h-[62vh] gap-2 overflow-y-auto pr-1">
            {selectedBatch.students.map((student) => {
              const query = new URLSearchParams({
                assessmentBatchId: selectedBatch.id,
                assessmentStudentId: student.studentId
              });
              const selected = student.studentId === selectedStudentId;

              return (
                <a
                  key={student.studentId}
                  href={`/teacher/assessments?${query.toString()}#batch-assessment`}
                  className={`focus-ring rounded-xl border p-3 transition ${selected ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-lead-navy">{student.studentName}</p>
                      <p className="mt-1 text-xs text-lead-gray">{student.studentId}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${student.overallGrade === "A" ? "bg-emerald-50 text-emerald-700" : student.overallGrade === "B" ? "bg-yellow-50 text-yellow-800" : student.overallGrade === "C" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                      {student.overallGrade ? `Grade ${student.overallGrade}` : student.assessmentStatus}
                    </span>
                  </div>
                </a>
              );
            })}
            {!selectedBatch.students.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-lead-gray">No students assigned to this batch.</p> : null}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
