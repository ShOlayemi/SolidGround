// ──────────────────────────────────────────────────────────────
// SolidGround AI — Privacy Center content (web)
// ──────────────────────────────────────────────────────────────
// A plain-language inventory of what SolidGround stores and who can see it,
// organized by data category. Every category carries one or more three-way
// labels — PRIVATE (only you), SHARED WITH PARTNER (both people in a
// connected pairing), USED TO PROVIDE A SERVICE (processing / security) —
// and maps to the app's actual tables (pairings, assessment_sessions,
// comparison_reports, relationship_topics, private_reflections,
// shared_goals, shared_agreements, coach_conversations, ...).
//
// Mirrors the mobile app's lib/privacy/ content 1:1, adapted to the web's
// table names. Pure data — no JSX, no imports. Icons are referenced by name
// and mapped to lucide-react components in the rendering component.
// ──────────────────────────────────────────────────────────────

export type PrivacyLabelKind = "private" | "shared" | "service";

export interface PrivacyCategory {
  /** Stable identifier (used as an anchor / card key). */
  id: string;
  /** Human-readable category title. */
  title: string;
  /**
   * Visibility labels, in display order. A category may carry two labels
   * (e.g. reports are PRIVATE and USED TO PROVIDE A SERVICE).
   */
  labels: PrivacyLabelKind[];
  /** 2–4 plain-language sentences. Must match what the app actually does. */
  copy: string;
  /** Icon key, mapped to a lucide-react icon in the rendering component. */
  icon: "lock" | "people" | "file" | "brain" | "book" | "message" | "chart" | "bell" | "flag" | "scroll";
}

/** Badge text shown for each label kind. */
export const PRIVACY_LABEL_TEXT: Record<PrivacyLabelKind, string> = {
  private: "PRIVATE",
  shared: "SHARED WITH PARTNER",
  service: "USED TO PROVIDE A SERVICE",
};

/** Short human explanation of each label kind (shown once in the intro). */
export const PRIVACY_LABEL_EXPLAINER: Record<PrivacyLabelKind, string> = {
  private: "Only you can see this.",
  shared: "Both people in a connected pairing can see it.",
  service: "Used to run and secure the app — never shared.",
};

/** All data categories, grouped and order by how sensitive they feel. */
export const PRIVACY_CATEGORIES: PrivacyCategory[] = [
  {
    id: "account",
    title: "Your account & profile",
    labels: ["private"],
    icon: "lock",
    copy: "Your account details — email, name, and the profile fields you filled in (age, location, relationship status, and the rest) — are stored privately and only you can see them. The one exception is your display name: a connected partner sees that on the connection screen. You can edit or remove these details any time from your profile.",
  },
  {
    id: "blueprint",
    title: "Your Compatibility Blueprint™",
    labels: ["private"],
    icon: "file",
    copy: "Your Blueprint answers and results are stored privately and only you can see them. When you connect with a partner, a comparison report is generated from both of your results, and that report — the alignment percentage and category-by-category comparison — is visible to both of you. Your raw answers and individual results are never shown to your partner.",
  },
  {
    id: "coach",
    title: "Coach conversations",
    labels: ["private"],
    icon: "brain",
    copy: "Your coach conversations are private to you — only you can read or delete them, and nothing you write to the coach is ever shown to your partner. To reply, the coach processes the message you send (and, when you start from your results, a short summary of your Blueprint strengths — never your answers or reflections). Your private reflections are never sent to the coach.",
  },
  {
    id: "reflections",
    title: "Your private reflections",
    labels: ["private"],
    icon: "book",
    copy: "Your private reflections live only in your account. Only you can see, edit, or delete them — your partner can't, and the coach never reads them. You can write as many as you like from the Journey screen.",
  },
  {
    id: "topics",
    title: "Relationship topics",
    labels: ["shared"],
    icon: "message",
    copy: "Relationship topics are part of your shared Journey: they're drawn from your Alignment Match™ report and both you and your partner can see them, open them, and work through them together. They stay visible to both of you while you're connected.",
  },
  {
    id: "goals-agreements",
    title: "Shared goals & agreements",
    labels: ["shared"],
    icon: "chart",
    copy: "Shared goals and shared agreements are things you and your partner create together. Both of you can see, edit, and delete them, and they remain part of your shared Journey while you're connected.",
  },
  {
    id: "connection",
    title: "Your connection & messages",
    labels: ["shared"],
    icon: "people",
    copy: "When you connect, the connection — your partner's display name and your Alignment Match™ report — is visible to both of you, and so are the messages you send each other. While an invite is still pending, the 8-character invite code is the key to it: anyone who has the code can view the pending invite, which includes a snapshot of the inviter's Blueprint results, so only share a code with someone you trust. Once accepted, the connection is visible only to the two of you.",
  },
  {
    id: "notifications",
    title: "Notifications",
    labels: ["private", "service"],
    icon: "bell",
    copy: "Notifications — like a new invite or a message from your partner — are generated by the app so it can work for you, and only you can see them. Nobody else can send you notifications.",
  },
  {
    id: "reports-blocks",
    title: "Reports & blocked users",
    labels: ["private", "service"],
    icon: "flag",
    copy: "Reports you file and people you block are private to you. A report is kept so safety concerns can be reviewed and acted on, and a block is enforced by our systems so the blocked person can't invite, message, or connect with you again. Nothing you report is posted publicly.",
  },
  {
    id: "audit-logs",
    title: "Security logs",
    labels: ["service"],
    icon: "scroll",
    copy: "We keep a small, private log of security-relevant actions — like signing in, updating your profile, or accepting an invite — to keep the service safe and reliable. Logs record what happened, never what you wrote: no messages, answers, or reflections are logged.",
  },
];

/** Plain-language intro shown above the inventory. */
export const PRIVACY_INTRO =
  "Here's exactly what SolidGround stores and who can see it. Everything below reflects what the app actually does today — if that ever changes, this page changes with it.";

/** Closing line — honest about the limit of this page. */
export const PRIVACY_FOOTER =
  "This page describes the app itself. It doesn't cover how your data is processed by the third-party services the app depends on (like hosting and AI) — that is governed by their own policies.";
