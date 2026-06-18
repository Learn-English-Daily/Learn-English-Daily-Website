import type { Db } from "mongodb";

export type TeacherDocument = {
  _id: string;
  name: string;
  active: boolean;
  createdAt?: Date;
};

export const defaultTeachers = [
  { id: "eva-yulia", name: "Ms Eva Yulia" },
  { id: "fiana-alsaban", name: "Ms Fiana Al'Saban" },
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
          $set: { name: teacher.name, active: true },
          $setOnInsert: { createdAt: now }
        },
        upsert: true
      }
    }))
  );
}
