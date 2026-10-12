/**
 * Whole years since an ISO calendar date (`YYYY-MM-DD`). Null when the
 * string is not a real date. Used so the UI can ask for a birthdate once
 * and everywhere else can show "X years old" / feed nutrition and the plan.
 */
export function ageFromBirthdate(iso: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const birth = new Date(year, month, day);
  if (
    Number.isNaN(birth.getTime()) ||
    birth.getFullYear() !== year ||
    birth.getMonth() !== month ||
    birth.getDate() !== day
  ) {
    return null;
  }
  let age = now.getFullYear() - year;
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age -= 1;
  return age;
}

/** Latest ISO birthdate that still yields at least `minAge` whole years. */
export function latestBirthdateForAge(minAge: number, now: Date = new Date()): string {
  return formatIsoDate(new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate()));
}

/** Earliest ISO birthdate that still yields at most `maxAge` whole years. */
export function earliestBirthdateForAge(maxAge: number, now: Date = new Date()): string {
  return formatIsoDate(new Date(now.getFullYear() - maxAge, now.getMonth(), now.getDate()));
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
