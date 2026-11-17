import type { Assessment, Batch, Course, DemoState, Expense, Payment, Session, Student, Teacher } from "./types";

const firstNames = ["Alya", "Bima", "Citra", "Daffa", "Elina", "Farhan", "Gita", "Haris", "Intan", "Jovan", "Keisha", "Luthfi", "Maya", "Naufal", "Olivia", "Putra", "Qiana", "Rafi", "Salma", "Tegar", "Uma", "Vino", "Wulan", "Xavier", "Yasmin", "Zidan"];
const lastNames = ["Adinata", "Baskara", "Cahyani", "Darmawan", "Elang", "Firmansyah", "Gunawan", "Hartono", "Iskandar", "Jatmiko", "Kusuma", "Lestari", "Mahendra", "Nugraha", "Pratama", "Rahman", "Santoso", "Utami"];
const courses: Course[] = ["Foundation English", "Confident English", "Fluent English", "Academic English"];
const today = new Date("2026-11-17T12:00:00+07:00");
const isoDay = (offset: number) => { const date = new Date(today); date.setDate(date.getDate() + offset); return date.toISOString().slice(0, 10); };

export const demoTeachers: Teacher[] = [
  ["DEMO-EMP-01", "Ms. Maya Putri", "Young learners", "Hybrid", "😊 Happy"],
  ["DEMO-EMP-02", "Mr. Arif Nugraha", "Conversation", "Online", "⚡ Energized"],
  ["DEMO-EMP-03", "Ms. Citra Lestari", "Grammar", "Hybrid", "😌 Calm"],
  ["DEMO-EMP-04", "Ms. Nabila Rahman", "Academic English", "Online", "🎯 Focused"],
  ["DEMO-EMP-05", "Mr. Dimas Santoso", "Business English", "Offline", "😊 Happy"],
  ["DEMO-EMP-06", "Ms. Rani Kusuma", "Pronunciation", "Hybrid", "🌱 Growing"],
  ["DEMO-EMP-07", "Mr. Fajar Pratama", "Group classes", "Offline", "😌 Calm"],
  ["DEMO-EMP-08", "Ms. Tiara Cahyani", "Fluency", "Online", "⚡ Energized"]
].map(([id, name, specialty, mode, mood]) => ({ id, name, specialty, mode, mood, active: true }));

export const demoBatches: Batch[] = [
  ["DEMO-BAT-01", "Bright Stars", "Foundation English", "DEMO-EMP-01"],
  ["DEMO-BAT-02", "Young Explorers", "Foundation English", "DEMO-EMP-07"],
  ["DEMO-BAT-03", "Confident Speakers", "Confident English", "DEMO-EMP-03"],
  ["DEMO-BAT-04", "Conversation Crew", "Confident English", "DEMO-EMP-02"],
  ["DEMO-BAT-05", "Fluency Champions", "Fluent English", "DEMO-EMP-08"],
  ["DEMO-BAT-06", "Academic Pathway", "Academic English", "DEMO-EMP-04"]
].map(([id, name, course, teacherId], index) => ({ id, name, course: course as Course, teacherId, studentIds: [], completedMeetings: 22 + index * 4, totalMeetings: course === "Foundation English" ? 72 : course === "Academic English" ? 48 : 72 }));

export function createSeed(): DemoState {
  const batches = demoBatches.map((batch) => ({ ...batch, studentIds: [] as string[] }));
  const students: Student[] = Array.from({ length: 120 }, (_, index) => {
    const id = `DEMO-STU-${String(index + 1).padStart(3, "0")}`;
    const group = index >= 60;
    const batch = group ? batches[index % batches.length] : undefined;
    const course = batch?.course || courses[index % courses.length];
    const student: Student = { id, name: `${firstNames[index % firstNames.length]} ${lastNames[(index * 5) % lastNames.length]}`, course, classType: group ? "Basic Group" : "Private 1-to-1", mode: index % 3 ? "Online" : "Offline", teacherId: batch?.teacherId || demoTeachers[index % demoTeachers.length].id, batchId: batch?.id, status: index % 29 === 0 ? "Paused" : index % 41 === 0 ? "Completed" : "Active", progress: 18 + (index * 7) % 79, email: `demo.student${index + 1}@example.test`, phone: `+62 000 555 ${String(index + 1).padStart(4, "0")}`, joined: `2026-${String((index % 8) + 1).padStart(2, "0")}-${String((index % 24) + 1).padStart(2, "0")}` };
    if (batch) batch.studentIds.push(id);
    return student;
  });
  const sessions: Session[] = Array.from({ length: 360 }, (_, index) => { const student = students[index % students.length]; const past = (index % 45) - 35; return { id: `DEMO-SES-${String(index + 1).padStart(4, "0")}`, studentId: student.classType === "Private 1-to-1" ? student.id : undefined, batchId: student.batchId, date: isoDay(past), time: `${String(9 + (index % 10)).padStart(2, "0")}:00`, topic: ["Daily routines", "Speaking practice", "Past activities", "Vocabulary review", "Storytelling"][index % 5], teacherId: student.teacherId, status: past > 0 ? "Scheduled" : index % 13 === 0 ? "Absent" : index % 9 === 0 ? "Late" : "Present" }; });
  const assessments: Assessment[] = students.slice(0, 96).map((student, index) => ({ id: `DEMO-AS-${index + 1}`, studentId: student.id, month: "2026-11", speaking: 60 + (index * 9) % 40, grammar: 58 + (index * 7) % 42, vocabulary: 62 + (index * 5) % 38, note: "Steady progress with good classroom participation." }));
  const payments: Payment[] = students.flatMap((student, index) => ["2026-10", "2026-11"].map((month, monthIndex) => ({ id: `DEMO-PAY-${index}-${monthIndex}`, studentId: student.id, month, amount: student.classType === "Basic Group" ? 450000 : 90000 + (index % 4) * 10000, status: (index + monthIndex) % 8 === 0 ? "Unpaid" as const : "Paid" as const, method: (index + monthIndex) % 8 === 0 ? "Not set" as const : index % 3 ? "Bank Transfer" as const : "Cash" as const })));
  const expenses: Expense[] = [{ id: "DEMO-EXP-1", month: "2026-11", category: "Teacher payments", amount: 12800000, note: "Synthetic monthly payroll" }, { id: "DEMO-EXP-2", month: "2026-11", category: "Learning materials", amount: 1850000, note: "Books and classroom supplies" }, { id: "DEMO-EXP-3", month: "2026-10", category: "Marketing", amount: 2400000, note: "Demo campaign" }];
  return { students, teachers: demoTeachers.map((teacher) => ({ ...teacher })), batches, sessions, assessments, payments, expenses, persona: "Admin", revision: 1 };
}
