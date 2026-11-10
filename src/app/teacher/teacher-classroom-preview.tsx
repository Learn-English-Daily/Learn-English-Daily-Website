import { Smile } from "lucide-react";
import { saveTeacherMood } from "@/app/teacher/actions";
import { avatarSettings, TeacherAvatar } from "@/app/teacher/teacher-avatar";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { getJakartaToday, moodDetails, teacherMoodOptions, type TeacherEngagementDocument } from "@/lib/teacher-engagement";

export function TeacherHeaderAvatar({ teacherName, profile }: { teacherName: string; profile: TeacherEngagementDocument | null }) {
  return <a href="/teacher/classroom" title="Visit My Classroom" className="focus-ring group flex shrink-0 items-center gap-2 rounded-2xl border border-blue-100 bg-white/80 p-1.5 pr-3 shadow-sm transition hover:-translate-y-0.5 hover:border-lead-blue"><span className="grid h-16 w-14 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-violet-100"><TeacherAvatar settings={avatarSettings(profile)} className="mt-3 h-20 w-16 drop-shadow" /></span><span className="hidden text-left sm:block"><span className="block text-[10px] font-black uppercase tracking-[.12em] text-lead-blue">My avatar</span><span className="block max-w-28 truncate text-xs font-bold text-lead-navy">{teacherName}</span></span></a>;
}

export function TeacherMoodControl({ profile }: { profile: TeacherEngagementDocument | null }) {
  const mood = moodDetails(profile?.moodDate === getJakartaToday() ? profile.mood : "");
  return <details className="relative"><summary className="focus-ring flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 text-sm font-bold text-lead-navy shadow-sm [&::-webkit-details-marker]:hidden"><Smile className="h-4 w-4 text-violet-600"/><span>{mood ? `${mood.emoji} ${mood.label}` : "Set mood"}</span></summary><div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-blue-100 bg-white p-4 shadow-xl"><p className="text-xs font-black uppercase tracking-[.12em] text-lead-blue">How are you today?</p><ActionFeedbackForm action={saveTeacherMood} successMessage="Today's mood saved." className="mt-3 grid grid-cols-2 gap-2">{teacherMoodOptions.map((option) => <button key={option.value} type="submit" name="mood" value={option.value} className={`focus-ring rounded-xl border px-3 py-2 text-left text-sm font-bold ${mood?.value === option.value ? "border-lead-blue bg-blue-50 text-lead-blue" : "border-slate-200 text-slate-600"}`}><span className="mr-2 text-xl">{option.emoji}</span>{option.label}</button>)}</ActionFeedbackForm><p className="mt-2 text-[10px] font-semibold text-slate-500">Visible to the main admin for team support.</p></div></details>;
}
