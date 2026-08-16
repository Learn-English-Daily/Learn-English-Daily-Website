"use client";

import { useState } from "react";
import { CalendarClock, Info, RotateCcw } from "lucide-react";
import { createClassSession, resetStudentMeetingSequence } from "@/app/admin/sessions/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";

type StudentOption = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classMode: string;
  nextMeetingNumber: number;
};

type TeacherOption = { id: string; name: string };

export function PrivateSessionForm({ students, teachers, defaultDate }: { students: StudentOption[]; teachers: TeacherOption[]; defaultDate: string }) {
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const selectedStudent = students.find((student) => student.studentId === selectedStudentId);

  return (
    <div>
      <ActionFeedbackForm action={createClassSession} successMessage="Class session saved successfully." className="grid gap-4">
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">
          Student
          <select name="studentId" required value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
            <option value="">Select student</option>
            {students.map((student) => <option key={student.id} value={student.studentId}>{student.studentName} ({student.studentId}) - {student.courseJoined}</option>)}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">
            Meeting Number
            <input value={selectedStudent?.nextMeetingNumber || ""} readOnly placeholder="Select a student first" className="h-12 w-full cursor-not-allowed rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-lead-blue" />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">
            Class Date (Indonesia)
            <input name="sessionDate" type="date" required defaultValue={defaultDate} className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">From Time (WIB)<input name="startTime" type="time" required className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" /></label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">To Time (WIB)<input name="endTime" type="time" required className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" /></label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">
            Class Mode
            <select key={selectedStudent?.studentId || "none"} name="classMode" required defaultValue={selectedStudent?.classMode || "Online"} className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy"><option value="Online">Online</option><option value="Offline">Offline</option></select>
          </label>
        </div>

        <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-lead-navy">Teachers <span className="text-lead-blue">*</span></legend>
          <p className="mb-3 text-xs text-lead-gray">Select one or more teachers for this class.</p>
          <div className="grid gap-2 sm:grid-cols-2">{teachers.map((teacher) => <label key={teacher.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-lead-navy"><input type="checkbox" name="teacherIds" value={teacher.id} className="h-4 w-4 accent-lead-blue" />{teacher.name}</label>)}</div>
        </fieldset>
        <Button type="submit" size="lg" className="w-full sm:w-fit" disabled={!selectedStudent}><CalendarClock className="h-4 w-4" /> Save Class Session</Button>
      </ActionFeedbackForm>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <ActionFeedbackForm action={resetStudentMeetingSequence} successMessage="Meeting sequence reset. The next scheduled class will be Meeting 1." className="grid gap-3">
          <input type="hidden" name="studentId" value={selectedStudentId} />
          <p className="flex items-start gap-2 text-xs leading-5 text-lead-gray"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />Use only when this student has completed a course phase and the next phase must restart from Meeting 1.</p>
          <Button type="submit" variant="secondary" disabled={!selectedStudent} title="Resets this student's next meeting to Meeting 1. Existing attendance and payment history is not changed. Future scheduled classes must be removed first." className="w-full text-amber-700 hover:border-amber-400 hover:text-amber-800"><RotateCcw className="h-4 w-4" /> Reset Next Meeting to 1</Button>
        </ActionFeedbackForm>
      </div>
    </div>
  );
}
