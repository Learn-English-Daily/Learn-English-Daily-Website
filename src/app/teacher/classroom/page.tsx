import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { BookOpenCheck, LockKeyhole, Sparkles, Star, Trophy } from "lucide-react";
import { answerDailyTeacherChallenge } from "@/app/teacher/actions";
import { AvatarBuilder } from "@/app/teacher/avatar-builder";
import { avatarSettings, TeacherAvatar } from "@/app/teacher/teacher-avatar";
import { TeacherLoginForm } from "@/app/teacher/login-form";
import { TeacherPortalTabs } from "@/app/teacher/teacher-tabs";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getBatchClassSessionsCollectionName } from "@/lib/batch-class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import {
  calculateTeacherStars,
  getDailyTeacherChallenge,
  getJakartaToday,
  getTeacherEngagementCollectionName,
  moodDetails,
  type TeacherEngagementDocument
} from "@/lib/teacher-engagement";
import { isValidTeacherSession, TEACHER_ID_COOKIE, TEACHER_SESSION_COOKIE } from "@/lib/teacher-auth";
import { getEmployeeTeacherById } from "@/lib/teachers";

export const dynamic = "force-dynamic";

const themeNames: Record<string, string> = { garden: "Garden Classroom", ocean: "Ocean Classroom", sunset: "Sunset Studio", space: "Space Academy" };
const themeStyles: Record<string, string> = { garden: "from-emerald-200 via-lime-50 to-yellow-100", ocean: "from-cyan-200 via-blue-50 to-indigo-100", sunset: "from-orange-200 via-rose-100 to-violet-200", space: "from-indigo-300 via-violet-200 to-slate-900" };
const rewards = [{ stars: 25, emoji: "🪴", name: "Desk Plant" }, { stars: 75, emoji: "🐱", name: "Class Pet" }, { stars: 150, emoji: "🏆", name: "Golden Trophy" }, { stars: 300, emoji: "🌈", name: "Rainbow Window" }];

export default async function TeacherClassroomPage() {
  noStore();
  const store = await cookies();
  const teacherId = store.get(TEACHER_ID_COOKIE)?.value || "";
  const session = store.get(TEACHER_SESSION_COOKIE)?.value || "";
  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherById(db, teacherId);
  if (!teacher?.username || !isValidTeacherSession(teacher.id, teacher.username, session)) return <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10"><Card className="w-full max-w-md p-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher</p><h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">My LEAD Classroom</h1><p className="mt-3 text-lead-gray">Sign in to visit your classroom.</p><TeacherLoginForm /></Card></main>;

  const [profile, attendanceCount, journalCount, groupCount] = await Promise.all([
    db.collection<TeacherEngagementDocument>(getTeacherEngagementCollectionName()).findOne({ teacherId: teacher.id }),
    db.collection(getStudentAttendanceCollectionName()).countDocuments({ teacherIds: teacher.id, status: { $in: ["Present", "Late"] } }),
    db.collection(getStudentAttendanceCollectionName()).countDocuments({ teacherIds: teacher.id, status: { $in: ["Present", "Late"] }, notes: { $regex: "\\S" } }),
    db.collection(getBatchClassSessionsCollectionName()).countDocuments({ teacherId: teacher.id, status: "Completed", attendanceMarked: true })
  ]);
  const today = getJakartaToday();
  const challenge = getDailyTeacherChallenge(today);
  const challengeComplete = Boolean(profile?.challengeDates?.includes(today));
  const stars = calculateTeacherStars(attendanceCount + groupCount, journalCount, profile?.challengeDates?.length || 0);
  const avatar = avatarSettings(profile); const theme = profile?.classroomTheme || "garden"; const mood = moodDetails(profile?.moodDate === today ? profile.mood : "");

  return <main className="min-h-screen bg-lead-soft"><header className="border-b border-blue-100 bg-white"><div className="container-shell py-6"><p className="text-xs font-black uppercase tracking-[.18em] text-lead-blue">LEAD Teacher</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-heading text-4xl font-extrabold text-lead-navy">My LEAD Classroom</h1><p className="mt-2 text-sm text-lead-gray">A little space that grows with your teaching work.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-5 py-2 font-black text-slate-900"><Star className="h-5 w-5 fill-current" />{stars} stars</span></div></div><TeacherPortalTabs active="classroom" /></header>
    <section className="container-shell grid gap-6 py-8"><section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${themeStyles[theme]} p-6 shadow-soft sm:p-9`}><div className="absolute left-8 top-8 text-6xl">✨</div><div className="absolute bottom-5 left-8 text-7xl">🪴</div><div className="absolute bottom-7 right-8 text-7xl">📚</div>{stars >= 75 ? <div className="absolute bottom-6 left-1/3 text-6xl">🐱</div> : null}{stars >= 300 ? <div className="absolute right-8 top-8 text-7xl">🌈</div> : null}<div className="relative mx-auto grid min-h-72 max-w-xl place-items-center text-center"><div><TeacherAvatar settings={avatar} className="mx-auto h-64 w-56 drop-shadow-xl" /><h2 className="-mt-3 font-heading text-3xl font-extrabold text-lead-navy">Teacher {teacher.name}</h2><p className="mt-2 font-bold text-slate-600">{themeNames[theme]} {mood ? `· Feeling ${mood.emoji} ${mood.label}` : ""}</p></div></div></section>
      <div className="grid gap-6 xl:grid-cols-2"><Card className="p-5"><p className="text-xs font-black uppercase tracking-[.15em] text-violet-700">Customize</p><h2 className="mt-2 font-heading text-2xl font-extrabold text-lead-navy">Build your teacher character</h2><p className="mt-2 text-sm text-lead-gray">Create a character that feels like you. Every choice updates the preview instantly.</p><AvatarBuilder profile={profile} /></Card>
        <Card className="p-5"><p className="text-xs font-black uppercase tracking-[.15em] text-emerald-700">Daily teacher challenge</p><h2 className="mt-2 font-heading text-2xl font-extrabold text-lead-navy">{challenge.question}</h2>{challengeComplete ? <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center"><BookOpenCheck className="mx-auto h-9 w-9 text-emerald-600" /><p className="mt-2 font-bold text-emerald-800">Today&apos;s challenge complete!</p><p className="mt-1 text-sm text-emerald-700">Come back tomorrow for a new teaching scenario.</p></div> : <ActionFeedbackForm action={answerDailyTeacherChallenge} successMessage="Challenge complete! +3 stars" className="mt-5 grid gap-3">{challenge.options.map((option) => <label key={option} className="cursor-pointer rounded-xl border border-slate-200 p-4 font-semibold text-lead-navy hover:border-lead-blue hover:bg-blue-50"><input type="radio" name="answer" value={option} required className="mr-3 accent-lead-blue" />{option}</label>)}<Button type="submit" className="mt-2"><Sparkles className="h-4 w-4" />Complete Challenge</Button></ActionFeedbackForm>}<div className="mt-6 grid grid-cols-3 gap-3"><MiniStat label="Attendance" value={attendanceCount + groupCount} /><MiniStat label="Journals" value={journalCount} /><MiniStat label="Challenges" value={profile?.challengeDates?.length || 0} /></div></Card></div>
      <Card className="p-5"><div className="flex items-center gap-3"><Trophy className="h-6 w-6 text-amber-500" /><div><h2 className="font-heading text-2xl font-extrabold text-lead-navy">Reward Shelf</h2><p className="text-sm text-lead-gray">Attendance earns 5 stars, completed journals earn 10, and daily challenges earn 3.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rewards.map((reward) => { const unlocked = stars >= reward.stars; return <div key={reward.name} className={`rounded-2xl border p-5 text-center ${unlocked ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-slate-50 grayscale"}`}><div className="text-6xl">{unlocked ? reward.emoji : <LockKeyhole className="mx-auto h-12 w-12 text-slate-400" />}</div><p className="mt-3 font-bold text-lead-navy">{reward.name}</p><p className="mt-1 text-xs font-bold text-lead-gray">{unlocked ? "Unlocked" : `${reward.stars} stars needed`}</p></div>; })}</div></Card>
    </section></main>;
}

function MiniStat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-slate-50 p-3 text-center"><p className="font-heading text-2xl font-extrabold text-lead-navy">{value}</p><p className="text-[10px] font-bold uppercase text-lead-gray">{label}</p></div>; }
