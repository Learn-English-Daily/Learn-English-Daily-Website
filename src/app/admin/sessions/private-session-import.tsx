"use client";

import { useActionState, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle, Upload, X } from "lucide-react";
import { importPrivateClassSessions } from "@/app/admin/sessions/import-actions";
import { Button } from "@/components/ui/button";

type Student = { studentId: string; studentName: string; courseJoined: string; classMode: string; nextMeetingNumber: number };
type Teacher = { name: string; username: string };
type ParsedRow = {
  rowNumber: number;
  studentId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classMode: string;
  teacherUsernames: string[];
  studentName: string;
  teacherNames: string[];
  meetingNumber: number;
  errors: string[];
};
type ImportState = { success: boolean; message?: string } | null;

const headers = ["student_id", "class_date", "start_time", "end_time", "class_mode", "teacher_usernames"];

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  if (typeof value === "object" && value && "text" in value) return String((value as { text: unknown }).text).trim();
  if (typeof value === "object" && value && "result" in value) return cellText((value as { result: unknown }).result);
  return String(value).trim();
}

function normalizeTime(value: unknown) {
  if (value instanceof Date) return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  const text = cellText(value);
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(text);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : text;
}

export function PrivateSessionImport({ students, teachers }: { students: Student[]; teachers: Teacher[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [state, action, pending] = useActionState<ImportState, FormData>(async (_previous, formData) => {
    try {
      return await importPrivateClassSessions(formData);
    } catch {
      return { success: false, message: "The import could not be completed. No classes were added. Refresh and try again." };
    }
  }, null);
  const validRows = rows.filter((row) => !row.errors.length);
  const errorRows = rows.filter((row) => row.errors.length);

  async function downloadTemplate() {
    setDownloading(true);
    setFileError("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "LEAD - Learn English Daily";
      workbook.created = new Date();
      const schedule = workbook.addWorksheet("Private Classes", { views: [{ state: "frozen", ySplit: 1 }] });
      schedule.columns = [
        { header: "student_id", key: "studentId", width: 18 }, { header: "class_date", key: "date", width: 16 },
        { header: "start_time", key: "start", width: 14 }, { header: "end_time", key: "end", width: 14 },
        { header: "class_mode", key: "mode", width: 16 }, { header: "teacher_usernames", key: "teachers", width: 32 }
      ];
      schedule.autoFilter = "A1:F1";
      schedule.getRow(1).height = 30;
      schedule.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } }; cell.alignment = { vertical: "middle" }; });
      for (let row = 2; row <= 301; row += 1) {
        schedule.getCell(`E${row}`).dataValidation = { type: "list", allowBlank: false, formulae: ['"Online,Offline"'] };
        schedule.getCell(`B${row}`).numFmt = "yyyy-mm-dd";
        schedule.getCell(`C${row}`).numFmt = "hh:mm";
        schedule.getCell(`D${row}`).numFmt = "hh:mm";
      }
      schedule.getColumn(1).eachCell((cell, row) => { if (row > 1) cell.numFmt = "@"; });
      schedule.getColumn(6).eachCell((cell, row) => { if (row > 1) cell.numFmt = "@"; });

      const instructions = workbook.addWorksheet("Instructions");
      instructions.columns = [{ width: 25 }, { width: 95 }];
      [
        ["LEAD PRIVATE CLASS IMPORT", "Complete the Private Classes sheet only. Do not rename sheets or columns."],
        ["student_id", "Required. Copy an active private student ID from the Students sheet."],
        ["class_date", "Required. Use YYYY-MM-DD, for example 2026-10-05."],
        ["start_time / end_time", "Required. Use 24-hour WIB time, for example 15:00 and 16:00."],
        ["class_mode", "Required. Use exactly Online or Offline."],
        ["teacher_usernames", "Required. Copy from Teachers. For multiple teachers use |, for example ina|adam."],
        ["Meeting numbers", "Do not add them. LEAD assigns the next meeting number by date and time."],
        ["Maximum", "Up to 300 classes per upload. Empty rows are ignored."],
        ["Important", "Do not use merged cells, formulas, extra headings, or group students. The complete file is rejected if any row has an error."]
      ].forEach((values) => instructions.addRow(values));
      instructions.getRow(1).height = 34;
      instructions.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 13 }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; });
      instructions.eachRow((row, index) => { row.alignment = { vertical: "top", wrapText: true }; if (index > 1) row.getCell(1).font = { bold: true, color: { argb: "FF2563EB" } }; });

      const studentSheet = workbook.addWorksheet("Students", { views: [{ state: "frozen", ySplit: 1 }] });
      studentSheet.columns = [{ header: "student_id", key: "id", width: 18 }, { header: "student_name", key: "name", width: 30 }, { header: "course", key: "course", width: 28 }, { header: "default_mode", key: "mode", width: 16 }, { header: "next_meeting", key: "meeting", width: 16 }];
      students.forEach((student) => studentSheet.addRow({ id: student.studentId, name: student.studentName, course: student.courseJoined, mode: student.classMode, meeting: student.nextMeetingNumber }));
      const teacherSheet = workbook.addWorksheet("Teachers", { views: [{ state: "frozen", ySplit: 1 }] });
      teacherSheet.columns = [{ header: "teacher_username", key: "username", width: 26 }, { header: "teacher_name", key: "name", width: 34 }];
      teachers.forEach((teacher) => teacherSheet.addRow({ username: teacher.username, name: teacher.name }));
      [studentSheet, teacherSheet].forEach((sheet) => { sheet.autoFilter = { from: "A1", to: sheet === studentSheet ? "E1" : "B1" }; sheet.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } }; }); });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `LEAD-private-class-import-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click();
      URL.revokeObjectURL(url);
    } catch {
      setFileError("The Excel template could not be generated. Please refresh and try again.");
    } finally { setDownloading(false); }
  }

  async function readFile(file?: File) {
    if (!file) return;
    setFileError(""); setRows([]);
    if (!file.name.toLowerCase().endsWith(".xlsx")) { setFileError("Upload an .xlsx file created from the LEAD template."); return; }
    if (file.size > 5 * 1024 * 1024) { setFileError("The workbook must be smaller than 5 MB."); return; }
    setReading(true); setFileName(file.name);
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.getWorksheet("Private Classes");
      if (!sheet) throw new Error("Missing sheet");
      const actualHeaders = headers.map((_, index) => cellText(sheet.getRow(1).getCell(index + 1).value).toLowerCase());
      if (actualHeaders.some((header, index) => header !== headers[index])) throw new Error("Headers changed");
      const studentsById = new Map(students.map((student) => [student.studentId.toLowerCase(), student]));
      const teachersByUsername = new Map(teachers.filter((teacher) => teacher.username).map((teacher) => [teacher.username.toLowerCase(), teacher]));
      const parsed: ParsedRow[] = [];
      sheet.eachRow((excelRow, rowNumber) => {
        if (rowNumber === 1) return;
        const values = headers.map((_, index) => excelRow.getCell(index + 1).value);
        if (values.every((value) => !cellText(value))) return;
        const studentId = cellText(values[0]); const sessionDate = cellText(values[1]); const startTime = normalizeTime(values[2]); const endTime = normalizeTime(values[3]);
        const rawMode = cellText(values[4]); const classMode = rawMode.toLowerCase() === "online" ? "Online" : rawMode.toLowerCase() === "offline" ? "Offline" : rawMode;
        const teacherUsernames = cellText(values[5]).split(/[|,]/).map((value) => value.trim().toLowerCase()).filter(Boolean);
        const student = studentsById.get(studentId.toLowerCase()); const selectedTeachers = teacherUsernames.map((username) => teachersByUsername.get(username)); const rowErrors: string[] = [];
        if (!student) rowErrors.push("Active private student ID not found");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) rowErrors.push("Use date format YYYY-MM-DD");
        if (!/^\d{2}:\d{2}$/.test(startTime)) rowErrors.push("Invalid start time");
        if (!/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime) rowErrors.push("End time must be later");
        if (!(["Online", "Offline"] as string[]).includes(classMode)) rowErrors.push("Mode must be Online or Offline");
        if (!teacherUsernames.length) rowErrors.push("Teacher username is required");
        teacherUsernames.forEach((username, index) => { if (!selectedTeachers[index]) rowErrors.push(`Teacher “${username}” not found`); });
        parsed.push({ rowNumber, studentId, sessionDate, startTime, endTime, classMode, teacherUsernames, studentName: student?.studentName || "Unknown student", teacherNames: selectedTeachers.filter(Boolean).map((teacher) => teacher!.name), meetingNumber: 0, errors: rowErrors });
      });
      if (!parsed.length) { setFileError("No class rows were found in the Private Classes sheet."); return; }
      if (parsed.length > 300) { setFileError("The workbook has more than 300 class rows. Split it into smaller files."); return; }
      parsed.forEach((row, index) => { const overlap = parsed.slice(0, index).find((other) => other.studentId.toLowerCase() === row.studentId.toLowerCase() && other.sessionDate === row.sessionDate && other.startTime < row.endTime && other.endTime > row.startTime); if (overlap) { row.errors.push(`Overlaps row ${overlap.rowNumber}`); overlap.errors.push(`Overlaps row ${row.rowNumber}`); } });
      students.forEach((student) => parsed.filter((row) => row.studentId.toLowerCase() === student.studentId.toLowerCase()).sort((left, right) => left.sessionDate.localeCompare(right.sessionDate) || left.startTime.localeCompare(right.startTime) || left.rowNumber - right.rowNumber).forEach((row, index) => { row.meetingNumber = student.nextMeetingNumber + index; }));
      setRows(parsed);
    } catch (error) {
      setFileError(error instanceof Error && error.message === "Headers changed" ? "The column headings changed. Download a fresh template and keep row 1 unchanged." : "This workbook could not be read. Use the LEAD .xlsx template and try again.");
    } finally { setReading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  function clear() { setRows([]); setFileName(""); setFileError(""); }
  const payload = JSON.stringify(validRows.map(({ rowNumber, studentId, sessionDate, startTime, endTime, classMode, teacherUsernames }) => ({ rowNumber, studentId, sessionDate, startTime, endTime, classMode, teacherUsernames })));

  return <div>
    <div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><FileSpreadsheet className="h-5 w-5" /></div><div><h2 className="font-heading text-xl font-bold text-lead-navy">Import monthly schedule</h2><p className="mt-1 text-sm leading-6 text-lead-gray">Schedule up to 300 private classes from one Excel workbook.</p></div></div>
    <ol className="mt-5 grid gap-2 text-sm font-semibold text-lead-navy sm:grid-cols-3"><li className="rounded-xl bg-blue-50 p-3"><span className="mr-2 text-lead-blue">1</span>Download template</li><li className="rounded-xl bg-blue-50 p-3"><span className="mr-2 text-lead-blue">2</span>Fill class rows</li><li className="rounded-xl bg-blue-50 p-3"><span className="mr-2 text-lead-blue">3</span>Preview and import</li></ol>
    <Button type="button" variant="secondary" onClick={downloadTemplate} disabled={downloading} className="mt-4 w-full"><Download className="h-4 w-4" />{downloading ? "Preparing template..." : "Download Excel Template"}</Button>
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files[0]); }} className={`mt-4 rounded-2xl border-2 border-dashed p-5 text-center transition ${dragging ? "border-lead-blue bg-blue-50" : "border-slate-300 bg-slate-50"}`}><Upload className="mx-auto h-7 w-7 text-lead-blue" /><p className="mt-2 font-bold text-lead-navy">Drop completed workbook here</p><p className="mt-1 text-xs text-lead-gray">.xlsx only · maximum 5 MB</p><input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void readFile(event.target.files?.[0])} className="sr-only" /><Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={reading} className="mt-3">{reading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Reading workbook...</> : "Choose Excel File"}</Button></div>
    {fileError ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-700"><AlertCircle className="mr-2 inline h-4 w-4" />{fileError}</p> : null}
    {rows.length ? <div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-lead-navy">{fileName}</p><p className="text-xs text-lead-gray">Review before importing. Existing schedule conflicts are checked again on confirmation.</p></div><button type="button" onClick={clear} className="focus-ring rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Remove workbook"><X className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm font-bold"><div className="rounded-xl bg-slate-100 p-3"><strong className="block text-xl text-lead-navy">{rows.length}</strong>Total</div><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><strong className="block text-xl">{validRows.length}</strong>Ready</div><div className={`rounded-xl p-3 ${errorRows.length ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}><strong className="block text-xl">{errorRows.length}</strong>Errors</div></div><div className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-slate-200"><table className="min-w-[760px] w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr>{["Row", "Student", "Meeting", "Date & time", "Mode", "Teacher", "Status"].map((heading) => <th key={heading} className="px-3 py-2 font-black uppercase">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.rowNumber} className="border-t border-slate-100"><td className="px-3 py-3 font-bold">{row.rowNumber}</td><td className="px-3 py-3"><strong className="block text-lead-navy">{row.studentName}</strong>{row.studentId}</td><td className="px-3 py-3 font-bold">{row.meetingNumber || "-"}</td><td className="px-3 py-3">{row.sessionDate}<br />{row.startTime} - {row.endTime} WIB</td><td className="px-3 py-3">{row.classMode}</td><td className="px-3 py-3">{row.teacherNames.join(", ") || row.teacherUsernames.join(", ")}</td><td className="px-3 py-3">{row.errors.length ? <span className="font-bold text-rose-700">{row.errors.join("; ")}</span> : <span className="font-bold text-emerald-700"><CheckCircle2 className="mr-1 inline h-4 w-4" />Ready</span>}</td></tr>)}</tbody></table></div>
      <form action={action} className="mt-4"><input type="hidden" name="rows" value={payload} />{errorRows.length ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Fix every highlighted row in Excel, then upload the workbook again. Nothing has been imported.</p> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">Ready to schedule {validRows.length} private classes</p><p className="mt-1 text-xs leading-5 text-emerald-800">Meeting numbers are assigned chronologically. The complete import will be cancelled if the server finds a conflict.</p><Button type="submit" disabled={pending} className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700">{pending ? <><LoaderCircle className="h-4 w-4 animate-spin" />Checking and importing...</> : `Confirm & Import ${validRows.length} Classes`}</Button></div>}{state?.message ? <p role={state.success ? "status" : "alert"} className={`mt-3 whitespace-pre-line rounded-xl p-3 text-sm font-bold leading-6 ${state.success ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p> : null}</form>
    </div> : null}
  </div>;
}
