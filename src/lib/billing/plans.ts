import type { PlanDefinition, PlanTier } from '@/types';

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: 'free', name: 'Free', price: 0, interval: 'month',
    features: ['Unlimited Blueprints', 'Full AI insights', 'Partner comparison', 'AI Relationship Coach', 'Report history', 'PDF exports'],
    limits: { blueprintCount: -1, aiInsightCount: -1, partnerComparison: true, aiCoach: true, pdfExports: true, reportHistory: true, prioritySupport: true },
  },
  premium_monthly: {
    tier: 'premium_monthly', name: 'Premium Monthly', price: 999, interval: 'month',
    features: ['Unlimited Blueprint updates', 'Full AI reports', 'Partner comparison', 'AI Relationship Coach', 'Report history', 'PDF exports', 'Priority support'],
    limits: { blueprintCount: -1, aiInsightCount: -1, partnerComparison: true, aiCoach: true, pdfExports: true, reportHistory: true, prioritySupport: true },
  },
  premium_annual: {
    tier: 'premium_annual', name: 'Premium Annual', price: 799, interval: 'year',
    features: ['Everything in Monthly', '2 months free', 'Priority support'],
    limits: { blueprintCount: -1, aiInsightCount: -1, partnerComparison: true, aiCoach: true, pdfExports: true, reportHistory: true, prioritySupport: true },
  },
};

export function getPlan(tier: PlanTier): PlanDefinition { return PLANS[tier]; }
export function getDefaultPlan(): PlanDefinition { return PLANS.free; }
