export const employeeRoleOptions = ["Teacher", "Admin", "Marketing", "Finance", "Content", "Operations", "Other"] as const;
export const employeeWorkModeOptions = ["Online", "Offline", "Hybrid"] as const;
export const employeeEmploymentTypeOptions = ["Full-time", "Part-time", "Freelance", "Internship", "Contract"] as const;

export type EmployeeRole = (typeof employeeRoleOptions)[number];
export type EmployeeWorkMode = (typeof employeeWorkModeOptions)[number];
export type EmployeeEmploymentType = (typeof employeeEmploymentTypeOptions)[number];

export function getEmployeeOnboardingCollectionName() {
  return process.env.MONGODB_EMPLOYEE_ONBOARDING_COLLECTION || "employee_onboarding";
}

export function isEmployeeRole(value: string): value is EmployeeRole {
  return employeeRoleOptions.includes(value as EmployeeRole);
}

export function isEmployeeWorkMode(value: string): value is EmployeeWorkMode {
  return employeeWorkModeOptions.includes(value as EmployeeWorkMode);
}

export function isEmployeeEmploymentType(value: string): value is EmployeeEmploymentType {
  return employeeEmploymentTypeOptions.includes(value as EmployeeEmploymentType);
}
