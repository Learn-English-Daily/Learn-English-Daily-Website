import { ArrowRight, Sparkles, Star } from "lucide-react";
import { saveTeacherMood } from "@/app/teacher/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { getJakartaToday, moodDetails, teacherMoodOptions, type TeacherEngagementDocument } from "@/lib/teacher-engagement";

const themeStyles: Record<string, string> = {
  garden: "from-emerald-100 via-lime-50 to-yellow-100",
  ocean: "from-cyan-100 via-blue-50 to-indigo-100",
  sunset: "from-orange-100 via-rose-50 to-violet-100",
  space: "from-indigo-200 via-violet-100 to-slate-900"
};

export function TeacherClassroomPreview({ teacherName, profile, stars, attendanceRemaining, journalRemaining }: { teacherName: string; profile: TeacherEngagementDocument | null; stars: number; attendanceRemaining: number; journalRemaining: number }) {
  const mood = moodDetails(profile?.moodDate === getJakartaToday() ? profile?.mood : "");
  const face = profile?.avatarFace || "🧑‍🏫";
  const accessory = profile?.avatarAccessory || "✨";
  const theme = profile?.classroomTheme || "garden";
  const allClear = attendanceRemaining === 0 && journalRemaining === 0;
  return <section className={`overflow-hidden rounded-[1.75rem] border border-white bg-gradient-to-br ${themeStyles[theme] || themeStyles.garden} shadow-soft`}><div className="grid gap-6 p-5 lg:grid-cols-[.8fr_1.2fr] lg:p-7"><div className="relative grid min-h-56 place-items-center overflow-hidden rounded-3xl border border-white/70 bg-white/45"><span className="absolute left-5 top-5 text-5xl">{accessory}</span><span className="absolute bottom-3 left-5 text-5xl">🪴</span><span className="absolute bottom-4 right-5 text-6xl">📚</span><div className="text-center"><div className="text-8xl drop-shadow-lg">{face}</div><p className="mt-2 rounded-full bg-white/80 px-4 py-1 text-sm font-black text-lead-navy">Teacher {teacherName}</p></div></div><div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.18em] text-lead-blue">My LEAD Classroom</p><h2 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Welcome back, {teacherName}!</h2></div><span className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-4 py-2 font-black text-slate-900"><Star className="h-5 w-5 fill-current" />{stars} stars</span></div><p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{allClear ? "Everything is complete—your classroom is blooming today! 🌸" : `Today's mission: ${attendanceRemaining} attendance and ${journalRemaining} journal item${journalRemaining === 1 ? "" : "s"} remaining.`}</p><div className="mt-5"><p className="text-sm font-bold text-lead-navy">How are you today? {mood ? <span className="text-lead-blue">Current: {mood.emoji} {mood.label}</span> : null}</p><ActionFeedbackForm action={saveTeacherMood} successMessage="Today's mood saved." className="mt-3 flex flex-wrap gap-2">{teacherMoodOptions.map((option) => <button key={option.value} type="submit" name="mood" value={option.value} title={option.label} className={`focus-ring rounded-2xl border px-3 py-2 text-2xl transition hover:-translate-y-1 ${mood?.value === option.value ? "border-lead-blue bg-blue-100 shadow-sm" : "border-white bg-white/70"}`}>{option.emoji}<span className="ml-2 text-xs font-bold text-slate-600">{option.label}</span></button>)}</ActionFeedbackForm><p className="mt-2 text-[11px] font-semibold text-slate-500">Today&apos;s mood is visible to the main admin so they can support the teaching team.</p></div><Button asChild className="mt-5"><a href="/teacher/classroom"><Sparkles className="h-4 w-4" />Visit My Classroom<ArrowRight className="h-4 w-4" /></a></Button></div></div></section>;
}
