import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";

export type TeacherDocument = {
  _id: string;
  name: string;
  active: boolean;
  createdAt?: Date;
};

export type EmployeeTeacherDocument = {
  _id: ObjectId;
  fullName?: string;
  preferredName?: string;
  role?: string;
  status?: string;
};

export type TeacherOption = {
  id: string;
  name: string;
  source: "teachers" | "employee-onboarding";
};

export const defaultTeachers = [
  { id: "eva-yulia", name: "Ms Eva Yulia" },
  { id: "adam", name: "Mr Adam" }
] as const;

export function getTeachersCollectionName() {
  return process.env.MONGODB_TEACHERS_COLLECTION || "teachers";
}

export async function ensureDefaultTeachers(db: Db) {
  const collection = db.collection<TeacherDocument>(getTeachersCollectionName());
  const now = new Date();

  await collection.bulkWrite(
    defaultTeachers.map((teacher) => ({
      updateOne: {
        filter: { _id: teacher.id },
        update: {
          $set: { name: teacher.name },
          $setOnInsert: { active: true, createdAt: now }
        },
        upsert: true
      }
    }))
  );
}

function normalizeTeacherName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function employeeTeacherId(id: ObjectId | string) {
  return `employee:${id.toString()}`;
}

export async function getAvailableTeachers(db: Db): Promise<TeacherOption[]> {
  await ensureDefaultTeachers(db);

  const [teacherDocs, employeeTeacherDocs] = await Promise.all([
    db.collection<TeacherDocument>(getTeachersCollectionName()).find({ active: true }).sort({ name: 1 }).toArray(),
    db
      .collection<EmployeeTeacherDocument>(getEmployeeOnboardingCollectionName())
      .find({
        role: "Teacher",
        status: { $nin: ["inactive", "archived", "rejected"] }
      })
      .sort({ fullName: 1, preferredName: 1 })
      .toArray()
  ]);

  const teachers = new Map<string, TeacherOption>();

  for (const teacher of teacherDocs) {
    if (!teacher._id || !teacher.name) continue;
    teachers.set(normalizeTeacherName(teacher.name), {
      id: teacher._id,
      name: teacher.name,
      source: "teachers"
    });
  }

  for (const employee of employeeTeacherDocs) {
    const name = employee.preferredName || employee.fullName || "";
    if (!name) continue;
    const normalizedName = normalizeTeacherName(name);
    if (teachers.has(normalizedName)) continue;
    teachers.set(normalizedName, {
      id: employeeTeacherId(employee._id),
      name,
      source: "employee-onboarding"
    });
  }

  return [...teachers.values()].sort((first, second) => first.name.localeCompare(second.name));
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
  const teachers = await getAvailableTeachers(db);
  const teacher = teachers.find((item) => item.id === teacherId);

  if (!teacher) {
    throw new Error("Select a valid teacher");
  }

  return teacher;
}
