import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";
import { getMasterEmployeeById, getMasterEmployeeByUsername, isMasterUsername } from "@/lib/master-auth";
import { normalizeEmployeeUsername } from "@/lib/teachers";

export type FinanceEmployeeDocument = {
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

export type FinanceEmployee = {
  id: string;
  name: string;
  username: string;
};

export function financeEmployeeId(id: ObjectId | string) {
  return `employee:${id.toString()}`;
}

function isActiveFinanceEmployee(employee: FinanceEmployeeDocument) {
  const employeeStatus = (employee.employeeStatus || "Active").toLowerCase();
  const submissionStatus = (employee.status || "submitted").toLowerCase();
  const username = normalizeEmployeeUsername(employee.username || employee.email || "");

  return (
    (employee.role === "Finance" || isMasterUsername(username)) &&
    employeeStatus !== "inactive" &&
    !["inactive", "archived", "rejected"].includes(submissionStatus)
  );
}

function mapFinanceEmployee(employee: FinanceEmployeeDocument): FinanceEmployee | null {
  if (!isActiveFinanceEmployee(employee)) return null;

  const name = (employee.preferredName || employee.fullName || "").trim();
  const username = normalizeEmployeeUsername(employee.username || employee.email || "");
  if (!name || !username) return null;

  return {
    id: financeEmployeeId(employee._id),
    name,
    username
  };
}

export async function getFinanceEmployeeById(db: Db, employeeId: string): Promise<FinanceEmployee | null> {
  const rawId = employeeId.startsWith("employee:") ? employeeId.slice("employee:".length) : employeeId;
  if (!ObjectId.isValid(rawId)) return null;

  const employee = await db.collection<FinanceEmployeeDocument>(getEmployeeOnboardingCollectionName()).findOne({
    _id: new ObjectId(rawId),
    role: "Finance"
  });

  return employee ? mapFinanceEmployee(employee) : getMasterEmployeeById(db, employeeId);
}

export async function getFinanceEmployeeByUsername(db: Db, username: string): Promise<FinanceEmployee | null> {
  const normalizedUsername = normalizeEmployeeUsername(username);
  if (!normalizedUsername) return null;

  const employee = await db.collection<FinanceEmployeeDocument>(getEmployeeOnboardingCollectionName()).findOne({
    $and: [
      { role: "Finance" },
      {
        $or: [
          { username: normalizedUsername },
          { email: normalizedUsername }
        ]
      }
    ]
  });

  return employee ? mapFinanceEmployee(employee) : getMasterEmployeeByUsername(db, normalizedUsername);
}
