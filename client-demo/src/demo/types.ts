export type Persona = "Admin" | "Teacher" | "Finance";
export type Course = "Foundation English" | "Confident English" | "Fluent English" | "Academic English";
export type StudentStatus = "Active" | "Paused" | "Completed" | "Withdrawn";
export type AttendanceStatus = "Scheduled" | "Present" | "Late" | "Absent";

export type Student = { id: string; name: string; course: Course; classType: "Private 1-to-1" | "Basic Group"; mode: "Online" | "Offline"; teacherId: string; batchId?: string; status: StudentStatus; progress: number; email: string; phone: string; joined: string };
export type Teacher = { id: string; name: string; specialty: string; mode: string; active: boolean; mood: string };
export type Batch = { id: string; name: string; course: Course; teacherId: string; studentIds: string[]; completedMeetings: number; totalMeetings: number };
export type Session = { id: string; studentId?: string; batchId?: string; date: string; time: string; topic: string; teacherId: string; status: AttendanceStatus };
export type Assessment = { id: string; studentId: string; month: string; speaking: number; grammar: number; vocabulary: number; note: string };
export type Payment = { id: string; studentId: string; month: string; amount: number; status: "Paid" | "Unpaid"; method: "Bank Transfer" | "Cash" | "Not set" };
export type Expense = { id: string; month: string; category: string; amount: number; note: string };
export type DemoState = { students: Student[]; teachers: Teacher[]; batches: Batch[]; sessions: Session[]; assessments: Assessment[]; payments: Payment[]; expenses: Expense[]; persona: Persona; revision: number };
