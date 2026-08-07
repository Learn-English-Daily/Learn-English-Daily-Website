import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";
import { normalizeEmployeeUsername } from "@/lib/teachers";

export type AdminEmployeeDocument = {
  _id: ObjectId;
  fullName?: string;
  preferredName?: string;
  email?: string;
  role?: string;
  status?: string;
  employeeStatus?: string;
  username?: string;
  createdAt?: Date;
};

export type AdminEmployee = {
  id: string;
  name: string;
  username: string;
};

export function adminEmployeeId(id: ObjectId | string) {
  return `employee:${id.toString()}`;
}

function isActiveAdminEmployee(employee: AdminEmployeeDocument) {
  const employeeStatus = (employee.employeeStatus || "Active").toLowerCase();
  const submissionStatus = (employee.status || "submitted").toLowerCase();

  return (
    employee.role === "Admin" &&
    employeeStatus !== "inactive" &&
    !["inactive", "archived", "rejected"].includes(submissionStatus)
  );
}

function mapAdminEmployee(employee: AdminEmployeeDocument): AdminEmployee | null {
  if (!isActiveAdminEmployee(employee)) return null;

  const name = (employee.preferredName || employee.fullName || "").trim();
  const username = normalizeEmployeeUsername(employee.username || employee.email || "");
  if (!name || !username) return null;

  return {
    id: adminEmployeeId(employee._id),
    name,
    username
  };
}

export async function getAdminEmployeeById(db: Db, employeeId: string): Promise<AdminEmployee | null> {
  const rawId = employeeId.startsWith("employee:") ? employeeId.slice("employee:".length) : employeeId;
  if (!ObjectId.isValid(rawId)) return null;

  const employee = await db.collection<AdminEmployeeDocument>(getEmployeeOnboardingCollectionName()).findOne({
    _id: new ObjectId(rawId),
    role: "Admin"
  });

  return employee ? mapAdminEmployee(employee) : null;
}

export async function getAdminEmployeeByUsername(db: Db, username: string): Promise<AdminEmployee | null> {
  const normalizedUsername = normalizeEmployeeUsername(username);
  if (!normalizedUsername) return null;

  const employee = await db.collection<AdminEmployeeDocument>(getEmployeeOnboardingCollectionName()).findOne({
    role: "Admin",
    $or: [
      { username: normalizedUsername },
      { email: normalizedUsername }
    ]
  });

  return employee ? mapAdminEmployee(employee) : null;
}
