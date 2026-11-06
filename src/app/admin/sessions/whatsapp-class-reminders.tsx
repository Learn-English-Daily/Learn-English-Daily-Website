"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, MessageCircle } from "lucide-react";
import { markWhatsappReminderSent } from "@/app/admin/sessions/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";

type ReminderTeacher = { name: string; whatsapp: string };

function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

function indonesiaDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(Date.UTC(year, month - 1, day, 5)));
}

function displayTime(value: string) { return value.replace(":", "."); }

function teacherMessage(studentName: string, date: string, startTime: string, endTime: string, link: string, teacherName: string) {
  return `Halo, ${teacherName}! 💙\n\nIzin menginformasikan jadwal kelas online kursus Bahasa Inggris pada:\n👩‍🎓 Nama Murid: ${studentName}\n📅 Hari/Tanggal: ${indonesiaDate(date)}\n⏰ Waktu: ${displayTime(startTime)}–${displayTime(endTime)} WIB\n🔗 Link Kelas: ${link}\n\n📌 Catatan:\n\nLink kelas bersifat permanen dan khusus untuk masing-masing murid, sehingga dapat digunakan kembali pada pertemuan berikutnya.\nApabila terdapat kendala atau berhalangan mengajar, mohon menginformasikannya sesegera mungkin agar kami dapat menyesuaikan jadwal.\n\nTerima kasih atas kerja sama dan dedikasi ${teacherName} 💙\n\nSemoga kegiatan mengajar berjalan lancar dan menyenangkan! 🌱✨`;
}

function parentMessage(studentName: string, date: string, startTime: string, endTime: string, link: string, teacherNames: string[]) {
  return `🌟 Hello, Parents!\n\nIzin menginformasikan jadwal kelas online kursus Bahasa Inggris untuk ananda ${studentName} yang akan dilaksanakan pada:\n\n📅 ${indonesiaDate(date)}\n━━━━━━━━━━━━━━━\n⏰ Waktu: ${displayTime(startTime)}–${displayTime(endTime)} WIB\n👩‍🏫 Teacher: ${teacherNames.join(", ") || "Teacher LEAD"}\n🔗 Link Kelas: ${link}\n━━━━━━━━━━━━━━━\n\n📌 Catatan:\nLink kelas bersifat permanen dan khusus untuk masing-masing ananda, sehingga dapat disimpan dan digunakan kembali untuk pertemuan berikutnya.\nMohon ananda bergabung beberapa menit sebelum kelas dimulai. Jika terdapat kendala atau berhalangan hadir, mohon diinformasikan sesegera mungkin agar kami dapat menyesuaikan jadwal tutor.\nTerima kasih atas perhatian dan dukungan Bapak/Ibu. 💙\nSemoga sesi belajar ananda berjalan lancar dan menyenangkan! 🌱✨`;
}

export function WhatsappClassReminders({ sessionId, studentName, sessionDate, startTime, endTime, permanentMeetLink, parentWhatsapp, teachers, parentSentAt, teacherSentAt }: { sessionId: string; studentName: string; sessionDate: string; startTime: string; endTime: string; permanentMeetLink: string; parentWhatsapp: string; teachers: ReminderTeacher[]; parentSentAt: string; teacherSentAt: string }) {
  const parentDefault = useMemo(() => parentMessage(studentName, sessionDate, startTime, endTime, permanentMeetLink, teachers.map((teacher) => teacher.name)), [studentName, sessionDate, startTime, endTime, permanentMeetLink, teachers]);
  const teacherDefault = useMemo(() => teacherMessage(studentName, sessionDate, startTime, endTime, permanentMeetLink, teachers[0]?.name || "Teacher"), [studentName, sessionDate, startTime, endTime, permanentMeetLink, teachers]);
  const [parentText, setParentText] = useState(parentDefault);
  const [teacherText, setTeacherText] = useState(teacherDefault);
  const missing: string[] = [];
  if (!permanentMeetLink) missing.push("permanent Meet link");
  if (!parentWhatsapp) missing.push("parent WhatsApp number");
  if (!teachers.length) missing.push("assigned teacher");
  else if (teachers.some((teacher) => !teacher.whatsapp)) missing.push("teacher WhatsApp number");

  return <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="flex items-center gap-2 font-heading text-lg font-extrabold text-emerald-900"><MessageCircle className="h-5 w-5" />Today&apos;s WhatsApp reminders</p><p className="mt-1 text-xs text-emerald-800">Review the prepared message, open WhatsApp, press Send, then mark it sent here.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">Private 1-to-1</span></div>
    {missing.length ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">Cannot send yet: missing {missing.join(", ")}.</div> : null}
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <ReminderBox title="Parent reminder" text={parentText} setText={setParentText} phone={parentWhatsapp} ready={Boolean(permanentMeetLink && parentWhatsapp)} sentAt={parentSentAt} sessionId={sessionId} recipient="parent" />
      <ReminderBox title={`Teacher reminder${teachers[0]?.name ? ` · ${teachers[0].name}` : ""}`} text={teacherText} setText={setTeacherText} phone={teachers[0]?.whatsapp || ""} ready={Boolean(permanentMeetLink && teachers[0]?.whatsapp)} sentAt={teacherSentAt} sessionId={sessionId} recipient="teacher" />
    </div>
  </div>;
}

function ReminderBox({ title, text, setText, phone, ready, sentAt, sessionId, recipient }: { title: string; text: string; setText: (value: string) => void; phone: string; ready: boolean; sentAt: string; sessionId: string; recipient: "parent" | "teacher" }) {
  const href = ready ? `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}` : "#";
  return <div className="rounded-xl border border-emerald-100 bg-white p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-bold text-lead-navy">{title}</p>{sentAt ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-800"><CheckCircle2 className="h-3 w-3" />Marked sent</span> : null}</div><textarea value={text} onChange={(event) => setText(event.target.value)} rows={9} className="focus-ring mt-3 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs leading-5 text-lead-navy" /><div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm" className={!ready ? "pointer-events-none opacity-50" : "bg-emerald-600 hover:bg-emerald-700"}><a href={href} target="_blank" rel="noreferrer" aria-disabled={!ready}><ExternalLink className="h-4 w-4" />Open WhatsApp</a></Button><ActionFeedbackForm action={markWhatsappReminderSent} successMessage={`${title} marked as sent.`} className="contents"><input type="hidden" name="id" value={sessionId} /><input type="hidden" name="recipient" value={recipient} /><Button type="submit" size="sm" variant="secondary" disabled={!ready}><CheckCircle2 className="h-4 w-4" />Mark Sent</Button></ActionFeedbackForm></div></div>;
}
