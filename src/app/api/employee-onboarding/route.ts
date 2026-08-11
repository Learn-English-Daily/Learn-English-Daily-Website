import { NextResponse } from "next/server";
import {
  getEmployeeOnboardingCollectionName,
  getEmployeeIdCountersCollectionName,
  formatEmployeeId,
  isEmployeeEmploymentType,
  isEmployeeGender,
  isEmployeeRole,
  isEmployeeStatus,
  isEmployeeWorkMode
} from "@/lib/employee-onboarding";
import { normalizeEmployeeUsername } from "@/lib/teachers";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type EmployeeOnboardingPayload = {
  fullName?: string;
  preferredName?: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  cityCountry?: string;
  dateOfBirth?: string;
  gender?: string;
  role?: string;
  employeeStatus?: string;
  username?: string;
  employmentType?: string;
  workMode?: string;
  expectedStartDate?: string;
  availability?: string;
  education?: string;
  experience?: string;
  skills?: string;
  languages?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  idNumber?: string;
  taxNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  documentLinks?: string;
  notes?: string;
  consent?: boolean;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function isReasonableText(value: string, min = 1, max = 180) {
  return value.length >= min && value.length <= max;
}

function isOptionalText(value: string, max = 500) {
  return !value || value.length <= max;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}

function isValidDate(value: string) {
  if (!value) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidEmployeeUsername(value: string) {
  return /^[a-z0-9._-]{3,40}$/.test(value);
}

async function getNextEmployeeId(db: Awaited<ReturnType<typeof getMongoDb>>) {
  const counter = await db.collection<{ _id: string; seq: number }>(getEmployeeIdCountersCollectionName()).findOneAndUpdate(
    { _id: "EMP" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return formatEmployeeId(counter?.seq || 1);
}

function slugifyUsername(value: string) {
  return normalizeEmployeeUsername(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "")
      .replace(/\.{2,}/g, ".")
  );
}

async function generateUniqueUsername(db: Awaited<ReturnType<typeof getMongoDb>>, baseName: string) {
  const collection = db.collection(getEmployeeOnboardingCollectionName());
  const baseUsername = slugifyUsername(baseName) || "employee";

  for (let index = 0; index < 100; index += 1) {
    const username = index === 0 ? baseUsername : `${baseUsername}${index + 1}`;
    if (!isValidEmployeeUsername(username)) continue;

    const existing = await collection.findOne({
      $or: [
        { username },
        { teacherUsername: username }
      ],
      status: { $nin: ["archived", "rejected"] }
    });

    if (!existing) return username;
  }

  return `${baseUsername}.${Date.now().toString(36)}`.slice(0, 40);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as EmployeeOnboardingPayload | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const employee = {
    fullName: clean(payload.fullName),
    preferredName: clean(payload.preferredName),
    email: clean(payload.email).toLowerCase(),
    whatsapp: clean(payload.whatsapp),
    normalizedWhatsapp: normalizePhone(clean(payload.whatsapp)),
    address: clean(payload.address),
    cityCountry: clean(payload.cityCountry),
    dateOfBirth: clean(payload.dateOfBirth),
    gender: clean(payload.gender),
    role: clean(payload.role),
    employeeStatus: clean(payload.employeeStatus) || "Active",
    username: normalizeEmployeeUsername(clean(payload.username)),
    employmentType: clean(payload.employmentType),
    workMode: clean(payload.workMode),
    expectedStartDate: clean(payload.expectedStartDate),
    availability: clean(payload.availability),
    education: clean(payload.education),
    experience: clean(payload.experience),
    skills: clean(payload.skills),
    languages: clean(payload.languages),
    emergencyContactName: clean(payload.emergencyContactName),
    emergencyContactRelation: clean(payload.emergencyContactRelation),
    emergencyContactPhone: clean(payload.emergencyContactPhone),
    normalizedEmergencyContactPhone: normalizePhone(clean(payload.emergencyContactPhone)),
    idNumber: clean(payload.idNumber),
    taxNumber: clean(payload.taxNumber),
    bankName: clean(payload.bankName),
    bankAccountName: clean(payload.bankAccountName),
    bankAccountNumber: clean(payload.bankAccountNumber),
    documentLinks: clean(payload.documentLinks),
    notes: clean(payload.notes),
    consent: payload.consent === true,
    source: "employee-onboarding"
  };

  if (
    !isReasonableText(employee.fullName) ||
    !isValidEmail(employee.email) ||
    !isReasonableText(employee.whatsapp, 6, 40) ||
    !isReasonableText(employee.address, 5, 300) ||
    !isReasonableText(employee.cityCountry, 2, 120) ||
    !isValidDate(employee.dateOfBirth) ||
    !isEmployeeGender(employee.gender) ||
    !isEmployeeRole(employee.role) ||
    !isEmployeeStatus(employee.employeeStatus) ||
    !isEmployeeEmploymentType(employee.employmentType) ||
    !isEmployeeWorkMode(employee.workMode) ||
    !isValidDate(employee.expectedStartDate) ||
    !isReasonableText(employee.availability, 2, 250) ||
    !isReasonableText(employee.emergencyContactName) ||
    !isReasonableText(employee.emergencyContactRelation, 2, 80) ||
    !isReasonableText(employee.emergencyContactPhone, 6, 40)
  ) {
    return NextResponse.json({ ok: false, error: "Please complete all required fields correctly." }, { status: 400 });
  }

  if (
    !isOptionalText(employee.preferredName) ||
    !isOptionalText(employee.education) ||
    !isOptionalText(employee.experience) ||
    !isOptionalText(employee.skills) ||
    !isOptionalText(employee.languages) ||
    !isOptionalText(employee.idNumber, 120) ||
    !isOptionalText(employee.taxNumber, 120) ||
    !isOptionalText(employee.bankName, 120) ||
    !isOptionalText(employee.bankAccountName, 160) ||
    !isOptionalText(employee.bankAccountNumber, 120) ||
    !isOptionalText(employee.documentLinks, 1000) ||
    !isOptionalText(employee.notes, 1000)
  ) {
    return NextResponse.json({ ok: false, error: "Some optional fields are too long." }, { status: 400 });
  }

  if (!employee.consent) {
    return NextResponse.json({ ok: false, error: "Please confirm the consent checkbox." }, { status: 400 });
  }

  try {
    const db = await getMongoDb();
    const now = new Date();
    const username = employee.username || await generateUniqueUsername(db, employee.preferredName || employee.fullName);

    if (!isValidEmployeeUsername(username)) {
      return NextResponse.json({ ok: false, error: "Unable to generate a valid username. Please check the employee name." }, { status: 400 });
    }

    const collection = db.collection(getEmployeeOnboardingCollectionName());
    await collection.createIndex({ employeeId: 1 }, { unique: true, sparse: true, name: "unique_employee_id" });
    const employeeId = await getNextEmployeeId(db);

    const result = await collection.insertOne({
      ...employee,
      employeeId,
      employeeIdAssignedAt: now,
      username,
      status: "submitted",
      createdAt: now,
      updatedAt: now
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString(), employeeId, username }, { status: 201 });
  } catch (error) {
    console.error("Employee onboarding insert failed", error);
    return NextResponse.json({ ok: false, error: "Unable to submit right now. Please try again." }, { status: 500 });
  }
}
