import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";
import { normalizeEmployeeUsername } from "@/lib/teachers";

export const masterRoleNames = ["Owner", "Super Admin", "Master", "Admin"] as const;
export const masterUsernames = ["superuser"] as const;

type MasterEmployeeDocument = {
  _id: ObjectId;
  fullName?: string;
  preferredName?: string;
  email?: string;
  role?: string;
  status?: string;
  employeeStatus?: string;
  username?: string;
};

export type MasterEmployee = {
  id: string;
  name: string;
  username: string;
};

export function getMasterPasswordEnvName(username: string) {
  return `MASTER_PASSWORD_${username.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function getLegacyAdminPasswordEnvName(username: string) {
  return `ADMIN_PASSWORD_${username.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function getMasterPassword(username: string) {
  return process.env[getMasterPasswordEnvName(username)] || process.env[getLegacyAdminPasswordEnvName(username)] || "";
}

export function isMasterUsername(username = "") {
  return masterUsernames.includes(normalizeEmployeeUsername(username) as (typeof masterUsernames)[number]);
}

function isActiveMasterEmployee(employee: MasterEmployeeDocument) {
  const employeeStatus = (employee.employeeStatus || "Active").toLowerCase();
  const submissionStatus = (employee.status || "submitted").toLowerCase();
  const username = normalizeEmployeeUsername(employee.username || employee.email || "");

  return (
    employeeStatus !== "inactive" &&
    !["inactive", "archived", "rejected"].includes(submissionStatus) &&
    (isMasterUsername(username) || masterRoleNames.includes((employee.role || "") as (typeof masterRoleNames)[number]))
  );
}

function mapMasterEmployee(employee: MasterEmployeeDocument): MasterEmployee | null {
  if (!isActiveMasterEmployee(employee)) return null;

  const name = (employee.preferredName || employee.fullName || "").trim();
  const username = normalizeEmployeeUsername(employee.username || employee.email || "");
  if (!name || !username || !getMasterPassword(username)) return null;

  return {
    id: `employee:${employee._id.toString()}`,
    name,
    username
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getMasterEmployeeByUsername(db: Db, username: string): Promise<MasterEmployee | null> {
  const normalizedUsername = normalizeEmployeeUsername(username);
  if (!normalizedUsername) return null;

  const employee = await db.collection<MasterEmployeeDocument>(getEmployeeOnboardingCollectionName()).findOne({
    $or: [
      { username: normalizedUsername },
      { username: { $regex: `^${escapeRegex(normalizedUsername)}$`, $options: "i" } },
      { email: normalizedUsername },
      { email: { $regex: `^${escapeRegex(normalizedUsername)}$`, $options: "i" } }
    ]
  });

  return employee ? mapMasterEmployee(employee) : null;
}

export async function getMasterEmployeeById(db: Db, employeeId: string): Promise<MasterEmployee | null> {
  const rawId = employeeId.startsWith("employee:") ? employeeId.slice("employee:".length) : employeeId;
  if (!ObjectId.isValid(rawId)) return null;

  const employee = await db.collection<MasterEmployeeDocument>(getEmployeeOnboardingCollectionName()).findOne({
    _id: new ObjectId(rawId)
  });

  return employee ? mapMasterEmployee(employee) : null;
}
