// ──────────────────────────────────────────────────────────────
// SolidGround AI — Privacy Center view (server-compatible)
// ──────────────────────────────────────────────────────────────
// Renders the Privacy Center data inventory from src/lib/privacy/categories.ts
// as cards grouped by visibility label (PRIVATE / SHARED WITH PARTNER /
// USED TO PROVIDE A SERVICE), each with its own icon and visual treatment.
// Pure presentational component — no state, no data fetching (the server
// page passes the static categories). Links to the legal pages for full
// policy text.
// ──────────────────────────────────────────────────────────────
import Link from "next/link";
import {
  Brain,
  BookOpen,
  ChartColumn,
  FileText,
  Flag,
  Lock,
  MessageSquareText,
  Users,
  ScrollText,
  ShieldCheck,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  PRIVACY_CATEGORIES,
  PRIVACY_FOOTER,
  PRIVACY_INTRO,
  PRIVACY_LABEL_EXPLAINER,
  PRIVACY_LABEL_TEXT,
  type PrivacyCategory,
  type PrivacyLabelKind,
} from "@/lib/privacy/categories";

const ICONS: Record<PrivacyCategory["icon"], LucideIcon> = {
  lock: Lock,
  file: FileText,
  brain: Brain,
  book: BookOpen,
  message: MessageSquareText,
  chart: ChartColumn,
  people: Users,
  bell: Bell,
  flag: Flag,
  scroll: ScrollText,
};

/** Per-label visual treatment (icon + badge classes). */
const LABEL_STYLES: Record<
  PrivacyLabelKind,
  { icon: LucideIcon; badge: string; card: string; iconColor: string }
> = {
  private: {
    icon: Lock,
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    card: "border-slate-200",
    iconColor: "text-slate-600",
  },
  shared: {
    icon: Users,
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    card: "border-indigo-200",
    iconColor: "text-indigo-600",
  },
  service: {
    icon: ShieldCheck,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    card: "border-amber-200",
    iconColor: "text-amber-600",
  },
};

const LABEL_ORDER: PrivacyLabelKind[] = ["private", "shared", "service"];

function SectionHeader({ kind }: { kind: PrivacyLabelKind }) {
  const style = LABEL_STYLES[kind];
  const Icon = style.icon;
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg border ${style.badge}`}
      >
        <Icon size={18} aria-hidden />
      </span>
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {PRIVACY_LABEL_TEXT[kind]}
        </h2>
        <p className="text-[13px] text-text-secondary">
          {PRIVACY_LABEL_EXPLAINER[kind]}
        </p>
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: PrivacyCategory }) {
  const Icon = ICONS[category.icon];
  return (
    <article
      id={category.id}
      className="rounded-xl border border-card-border bg-card-bg p-5"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon size={17} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary">
            {category.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {category.labels.map((kind) => {
              const style = LABEL_STYLES[kind];
              return (
                <span
                  key={kind}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${style.badge}`}
                >
                  {PRIVACY_LABEL_TEXT[kind]}
                </span>
              );
            })}
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-text-secondary">
            {category.copy}
          </p>
        </div>
      </div>
    </article>
  );
}

export function PrivacyCenterView() {
  return (
    <div>
      <p className="mb-8 text-[15px] leading-relaxed text-text-secondary">
        {PRIVACY_INTRO}
      </p>

      {LABEL_ORDER.map((kind) => {
        const items = PRIVACY_CATEGORIES.filter((c) => c.labels.includes(kind));
        if (items.length === 0) return null;
        return (
          <section key={kind} className="mb-10">
            <SectionHeader kind={kind} />
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </section>
        );
      })}

      <div className="rounded-xl border border-card-border bg-card-bg px-5 py-4 text-[13px] leading-relaxed text-text-tertiary">
        <p>{PRIVACY_FOOTER}</p>
        <p className="mt-3">
          For the full policy text, see{" "}
          <Link href="/privacy" className="font-medium text-accent-600 hover:underline">
            our Privacy Policy
          </Link>
          ,{" "}
          <Link href="/terms" className="font-medium text-accent-600 hover:underline">
            Terms
          </Link>
          , and{" "}
          <Link href="/privacy/gdpr" className="font-medium text-accent-600 hover:underline">
            GDPR
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
