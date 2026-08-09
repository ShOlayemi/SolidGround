export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

export interface CompatibilityProfile {
  id: string;
  user_id: string;
  values_score: number;
  communication_score: number;
  finances_score: number;
  lifestyle_score: number;
  growth_score: number;
  created_at: string;
  updated_at: string;
}

// ── Profile Types ───────────────────────────────────────────

export type Gender = "male" | "female" | "other";

export type RelationshipType = "romantic" | "platonic";

export type RelationshipStatus =
  | "single"
  | "dating"
  | "engaged"
  | "married"
  | "divorced"
  | "widowed"
  | "complicated"
  | "prefer_not_to_say";

export type EducationLevel =
  | "high_school"
  | "some_college"
  | "associates"
  | "bachelors"
  | "masters"
  | "doctorate"
  | "trade_school"
  | "other"
  | "prefer_not_to_say";

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const RELATIONSHIP_STATUS_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "dating", label: "Dating" },
  { value: "engaged", label: "Engaged" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "complicated", label: "It's complicated" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export const EDUCATION_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "high_school", label: "High School" },
  { value: "some_college", label: "Some College" },
  { value: "associates", label: "Associate's Degree" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "trade_school", label: "Trade School" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export interface Profile {
  id: string;
  full_name: string;
  display_name: string | null;
  date_of_birth: string | null;
  gender?: Gender | null;
  age?: number | null;
  country: string | null;
  city: string | null;
  relationship_status: RelationshipStatus | null;
  education: EducationLevel | null;
  occupation: string | null;
  bio: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdatePayload {
  full_name: string;
  display_name?: string;
  date_of_birth?: string;
  gender?: Gender | "";
  country?: string;
  city?: string;
  relationship_status?: RelationshipStatus | "";
  education?: EducationLevel | "";
  occupation?: string;
  bio?: string;
  age?: number;
  avatar_url?: string;
}

export interface ProfileActionResult {
  success: boolean;
  error?: string;
}

// ── Audit Types ──────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ── Dashboard Types ──────────────────────────────────────────

import type { BlueprintResults } from "@/lib/scoring/types";

export type { BlueprintResults };

export type BlueprintStatus = "not_started" | "in_progress" | "complete";

export interface DashboardData {
  profile: Profile | null;
  auditEntries: AuditEntry[];
  blueprintStatus: BlueprintStatus;
  activeSession: AssessmentSession | null;
  completedSession: AssessmentSession | null;
  assessmentProgress: AssessmentProgress | null;
  latestResults: BlueprintResults | null;
}

// ── Assessment Types ──────────────────────────────────────────

export type AssessmentCategory =
  | "core_values"
  | "communication"
  | "lifestyle"
  | "money"
  | "career"
  | "family"
  | "children"
  | "conflict_resolution"
  | "health_wellness"
  | "personal_growth"
  | "social_life"
  | "long_term_vision";

export type QuestionType = "likert_5" | "single_choice" | "multi_choice" | "text";

export interface AssessmentQuestion {
  id: string;
  category: AssessmentCategory;
  text: string;
  type: QuestionType;
  options?: { value: string; label: string }[];
  platonicText?: string;
}

export interface AssessmentAnswer {
  id: string;
  session_id: string;
  question_id: string;
  category: AssessmentCategory;
  answer: unknown; // JSONB — number for likert, string for single_choice, string[] for multi_choice, string for text
  created_at: string;
  updated_at: string;
}

export interface AssessmentSession {
  id: string;
  user_id: string;
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  mode?: RelationshipType;
  current_category: string | null;
  current_question_index: number;
  total_questions_answered: number;
  responses: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryProgress {
  category: AssessmentCategory;
  label: string;
  total: number;
  answered: number;
  complete: boolean;
}

export interface AssessmentProgress {
  session: AssessmentSession;
  categories: CategoryProgress[];
  totalQuestions: number;
  totalAnswered: number;
  percentage: number;
}

export interface AssessmentActionResult {
  success: boolean;
  error?: string;
}

// ── Pairing Types ────────────────────────────────────────────

export type PairingStatus = "pending" | "accepted" | "active" | "completed";

export interface CategoryAlignment {
  categoryId: string;
  categoryName: string;
  inviterScore: number;
  inviteeScore: number;
  alignment: number; // 0–100
  sharedStrengths: string[]; // question IDs where both ≥ 75
  divergentAreas: string[]; // question IDs where diff ≥ 40
}

export interface AlignmentResults {
  overallAlignment: number; // 0–100
  categoryAlignments: CategoryAlignment[];
  createdAt: string;
}

export interface Pairing {
  id: string;
  invite_code: string;
  inviter_user_id: string;
  inviter_session_id: string;
  invitee_user_id: string | null;
  invitee_session_id: string | null;
  status: PairingStatus;
  alignment_results: AlignmentResults | null;
  created_at: string;
  updated_at: string;
}

export interface PairingWithNames {
  id: string;
  invite_code: string;
  inviter_user_id: string;
  inviter_name: string;
  inviter_avatar_url?: string | null;
  inviter_session_id: string;
  invitee_user_id: string | null;
  invitee_name: string | null;
  invitee_avatar_url?: string | null;
  invitee_session_id: string | null;
  status: PairingStatus;
  relationship_type?: RelationshipType;
  alignment_results: AlignmentResults | null;
  created_at: string;
  updated_at: string;
}

// ── Enhanced Alignment Types ──────────────────────────────────

export interface ConflictItem {
  categoryId: string;
  categoryName: string;
  severity: "high" | "medium" | "low";
  type: "value_clash" | "lifestyle_gap" | "communication_mismatch" | "vision_difference";
  description: string;
  inviterStance: string;
  inviteeStance: string;
}

export interface ConversationGuide {
  categoryId: string;
  categoryName: string;
  topic: string;
  prompts: string[];
}

export interface GrowthOpportunity {
  categoryId: string;
  categoryName: string;
  type: "shared" | "complementary";
  description: string;
  inviterScore: number;
  inviteeScore: number;
}

export interface DealBreakerIntersection {
  categoryId: string;
  categoryName: string;
  inviterTriggered: boolean;
  inviteeTriggered: boolean;
  bothTriggered: boolean;
}

export interface ComparisonReport {
  pairingId: string;
  overallCompatibility: number;
  categoryComparisons: CategoryAlignment[];
  sharedStrengths: { categoryId: string; categoryName: string; questionIds: string[] }[];
  potentialConflicts: ConflictItem[];
  conversationGuides: ConversationGuide[];
  growthOpportunities: GrowthOpportunity[];
  dealBreakerIntersections: DealBreakerIntersection[];
}

// ── Pairing Chat Types ───────────────────────────────────────

export interface PairingMessage {
  id: string;
  pairingId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
  senderName?: string;
  isCurrentUser?: boolean;
}

// ── AI Insights Types ─────────────────────────────────────────

export type PlanTier = 'free' | 'premium_monthly' | 'premium_annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing';
export type PaymentStatus = 'succeeded' | 'failed' | 'refunded' | 'pending';
export type InvoiceStatus = 'paid' | 'open' | 'void' | 'uncollectible';

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: { blueprintCount: number; aiInsightCount: number; partnerComparison: boolean; aiCoach: boolean; pdfExports: boolean; reportHistory: boolean; prioritySupport: boolean };
}

export interface StripeCustomer { id: string; userId: string; stripeCustomerId: string | null; createdAt: string; updatedAt: string; }
export interface Subscription { id: string; userId: string; stripeSubscriptionId: string | null; stripePriceId: string | null; planTier: PlanTier; status: SubscriptionStatus; currentPeriodStart: string | null; currentPeriodEnd: string | null; canceledAt: string | null; createdAt: string; updatedAt: string; }
export interface Payment { id: string; userId: string; subscriptionId: string | null; stripePaymentIntentId: string | null; stripeInvoiceId: string | null; amount: number; currency: string; status: PaymentStatus; createdAt: string; }
export interface BillingEvent { id: string; userId: string; eventType: string; eventData: Record<string, unknown> | null; createdAt: string; }
export interface Invoice { id: string; userId: string; stripeInvoiceId: string | null; stripeInvoiceUrl: string | null; amountPaid: number; currency: string; status: InvoiceStatus; invoicePdfUrl: string | null; periodStart: string | null; periodEnd: string | null; createdAt: string; }
export interface SubscriptionWithPlan extends Subscription { plan: PlanDefinition; }
export interface BillingOverview { currentPlan: PlanDefinition; subscription: Subscription | null; recentPayments: Payment[]; recentInvoices: Invoice[]; usageStats: { blueprintsCompleted: number; blueprintLimit: number; aiInsightsUsed: number; aiInsightLimit: number; }; }

export interface AIInsights {
  id?: string;
  sessionId: string;
  blueprintSummary: string;
  personalStrengths: string[];
  growthOpportunities: string[];
  reflectionQuestions: string[];
  communicationRecommendations: string[];
  relationshipReadiness: {
    level: string; // "High", "Moderate", "Developing"
    summary: string;
    strengths: string[];
    areas_to_develop: string[];
  };
  generatedAt?: string;
}

// ── Admin Types ──────────────────────────────────────────────

export type UserRole = 'user' | 'admin' | 'moderator' | 'support';

export interface AdminProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  blueprintCompleted: boolean;
  subscriptionTier: string;
  isSuspended: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  premiumUsers: number;
  monthlyRevenue: number;
  assessmentCompletions: number;
  blueprintReportsGenerated: number;
  partnerComparisons: number;
  aiInsightsGenerated: number;
  estimatedApiCost: number;
}

export interface AdminAuditEntry {
  id: string;
  adminUserId: string;
  adminName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}
