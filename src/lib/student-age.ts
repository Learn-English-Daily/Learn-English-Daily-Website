const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOfBirth(value: string, allowFuture = false) {
  if (!ISO_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return false;
  }

  if (year < 1900) return false;
  return allowFuture || value <= getTodayInJakarta();
}

export function getTodayInJakarta() {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return `${year}-${month}-${day}`;
}

export function calculateAgeFromDateOfBirth(dateOfBirth: string, today = getTodayInJakarta()) {
  if (!isValidDateOfBirth(dateOfBirth)) return null;

  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [currentYear, currentMonth, currentDay] = today.split("-").map(Number);
  let age = currentYear - birthYear;

  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function getStudentAgeLabel(dateOfBirth?: string, legacyAge?: string) {
  const calculatedAge = dateOfBirth ? calculateAgeFromDateOfBirth(dateOfBirth) : null;
  if (calculatedAge !== null) return String(calculatedAge);
  return legacyAge?.trim() ? `${legacyAge.trim()} (legacy)` : "Not available";
}
