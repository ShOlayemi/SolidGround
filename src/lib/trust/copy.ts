// ──────────────────────────────────────────────────────────────
// SolidGround AI — Trust & Safety user-facing copy (web)
// ──────────────────────────────────────────────────────────────
// Report category labels/order used by the report flow. These mirror the
// migration-036 `reports` CHECK constraint verbatim
// (harassment | inappropriate | unsafe | privacy | ai | other) — the values
// are the API contract, the labels are plain-language for users. Mirrors the
// mobile app's lib/trust/copy.ts 1:1. Pure data, no logic, no imports.
// ──────────────────────────────────────────────────────────────
import type { ReportCategory } from "@/lib/trust/actions";

/** The six report categories, in the order the report flow offers them. */
export const REPORT_CATEGORY_ORDER: readonly ReportCategory[] = [
  "harassment",
  "inappropriate",
  "unsafe",
  "privacy",
  "ai",
  "other",
];

/** Plain-language label per report category (migration-036 values verbatim). */
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  harassment: "Harassment",
  inappropriate: "Inappropriate content",
  unsafe: "Unsafe behavior",
  privacy: "Privacy concern",
  ai: "AI-related",
  other: "Something else",
};
