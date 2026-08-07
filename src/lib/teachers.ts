import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";

export type EmployeeTeacherDocument = {
  _id: ObjectId;
  fullName?: string;
  preferredName?: string;
  email?: string;
  role?: string;
  status?: string;
  employeeStatus?: string;
  employeeTitle?: string;
  gender?: string;
  teacherUsername?: string;
  createdAt?: Date;
};

export type TeacherOption = {
  id: string;
  name: string;
  username: string;
  source: "employee-onboarding";
};

export function employeeTeacherId(id: ObjectId | string) {
  return `employee:${id.toString()}`;
}

export function normalizeTeacherUsername(value = "") {
  return value.trim().toLowerCase();
}

function isActiveEmployeeTeacher(teacher: EmployeeTeacherDocument) {
  const employeeStatus = (teacher.employeeStatus || "Active").toLowerCase();
  const submissionStatus = (teacher.status || "submitted").toLowerCase();

  return (
    teacher.role === "Teacher" &&
    employeeStatus !== "inactive" &&
    !["inactive", "archived", "rejected"].includes(submissionStatus)
  );
}

function mapEmployeeTeacher(teacher: EmployeeTeacherDocument): TeacherOption | null {
  if (!isActiveEmployeeTeacher(teacher)) return null;

  const name = teacher.preferredName || teacher.fullName || "";
  if (!name) return null;

  return {
    id: employeeTeacherId(teacher._id),
    name: formatTeacherDisplayName(name, teacher),
    username: normalizeTeacherUsername(teacher.teacherUsername || ""),
    source: "employee-onboarding"
  };
}

function stripTeacherTitle(name: string) {
  return name.replace(/^(mr\.?|ms\.?|mrs\.?|miss)\s+/i, "").trim();
}

function inferTeacherTitle(name: string, teacher: EmployeeTeacherDocument) {
  const gender = (teacher.gender || "").trim().toLowerCase();
  if (gender === "female") return "Ms";
  if (gender === "male") return "Mr.";

  const oldTitle = (teacher.employeeTitle || "").trim();
  if (oldTitle === "Ms" || oldTitle === "Mr.") return oldTitle;

  const lookupValue = `${name} ${teacher.teacherUsername || ""} ${teacher.email || ""}`.toLowerCase();
  if (/\b(eva|yulia|fiana)\b/.test(lookupValue)) return "Ms";
  if (/\b(adam)\b/.test(lookupValue)) return "Mr.";

  return "";
}

function formatTeacherDisplayName(name: string, teacher: EmployeeTeacherDocument) {
  const trimmedName = name.trim().replace(/\s+/g, " ");
  if (/^(mr\.?|ms\.?|mrs\.?|miss)\s+/i.test(trimmedName)) return trimmedName;

  const title = inferTeacherTitle(trimmedName, teacher);
  return title ? `${title} ${stripTeacherTitle(trimmedName)}` : trimmedName;
}

export async function getAvailableTeachers(db: Db): Promise<TeacherOption[]> {
  const docs = await db
    .collection<EmployeeTeacherDocument>(getEmployeeOnboardingCollectionName())
    .find({
      role: "Teacher",
      employeeStatus: { $ne: "Inactive" },
      status: { $nin: ["inactive", "archived", "rejected"] }
    })
    .sort({ fullName: 1, preferredName: 1 })
    .toArray();

  return docs
    .map(mapEmployeeTeacher)
    .filter((teacher): teacher is TeacherOption => Boolean(teacher))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function getEmployeeTeacherById(db: Db, teacherId: string): Promise<TeacherOption | null> {
  const rawId = teacherId.startsWith("employee:") ? teacherId.slice("employee:".length) : teacherId;
  if (!ObjectId.isValid(rawId)) return null;

  const teacher = await db.collection<EmployeeTeacherDocument>(getEmployeeOnboardingCollectionName()).findOne({
    _id: new ObjectId(rawId),
    role: "Teacher"
  });

  return teacher ? mapEmployeeTeacher(teacher) : null;
}

export async function getEmployeeTeacherByUsername(db: Db, username: string): Promise<TeacherOption | null> {
  const normalizedUsername = normalizeTeacherUsername(username);
  if (!normalizedUsername) return null;

  const teacher = await db.collection<EmployeeTeacherDocument>(getEmployeeOnboardingCollectionName()).findOne({
    role: "Teacher",
    $or: [
      { teacherUsername: normalizedUsername },
      { email: normalizedUsername }
    ]
  });

  return teacher ? mapEmployeeTeacher(teacher) : null;
}

export async function resolveAvailableTeachers(db: Db, teacherIds: string[]) {
  const availableTeachers = await getAvailableTeachers(db);
  const namesById = new Map(availableTeachers.map((teacher) => [teacher.id, teacher.name]));
  const teacherNames = teacherIds.map((id) => namesById.get(id)).filter((name): name is string => Boolean(name));

  if (teacherNames.length !== teacherIds.length) {
    throw new Error("Invalid teacher selection");
  }

  return { teacherIds, teacherNames };
}

export async function resolveAvailableTeacher(db: Db, teacherId: string) {
  const teacher = await getEmployeeTeacherById(db, teacherId);

  if (!teacher) {
    throw new Error("Select a valid teacher");
  }

  return teacher;
}
