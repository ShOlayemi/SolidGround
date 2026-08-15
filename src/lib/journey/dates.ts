/**
 * SolidGround AI — Journey date helpers (pure, UI-only).
 *
 * The shared_goals.target_date column is TIMESTAMPTZ (ISO string). The goal
 * form collects a plain "YYYY-MM-DD" string; these pure helpers parse it into
 * an ISO timestamp (UTC midnight), format ISO values back into the input's
 * "YYYY-MM-DD" shape, and render short display labels. Kept dependency-free
 * and pure so the forms and their tests stay hermetic (mirrors the mobile
 * lib/journey/dates.ts 1:1).
 */

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type GoalDateParseResult =
  | { valid: true; iso: string | null }
  | { valid: false; iso: null };

/**
 * Parses a "YYYY-MM-DD" input into an ISO timestamp (UTC midnight). An empty
 * string means "no target date" (valid, iso null). Anything that is not a real
 * calendar date (wrong shape, month 13, Feb 31…) is invalid — the form shows a
 * friendly error instead of passing junk to the server action.
 */
export function parseGoalDate(value: string): GoalDateParseResult {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: true, iso: null };
  }
  const match = DATE_INPUT_PATTERN.exec(trimmed);
  if (!match) {
    return { valid: false, iso: null };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, iso: null };
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  // Round-trip guard: rejects impossible dates like 2026-02-31.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { valid: false, iso: null };
  }
  return { valid: true, iso: date.toISOString() };
}

/** ISO timestamp → "YYYY-MM-DD" for the form input (null/empty → ''). */
export function goalDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

/** ISO timestamp → short display label, e.g. "Sep 1, 2026". */
export function formatGoalDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
