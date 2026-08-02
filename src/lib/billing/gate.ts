import type { PlanDefinition } from '@/types';

export type FeatureName = keyof PlanDefinition['limits'];

export function canAccess(plan: PlanDefinition, feature: FeatureName): boolean {
  const limit = plan.limits[feature];
  if (typeof limit === 'boolean') return limit;
  if (typeof limit === 'number') return limit !== 0;
  return false;
}

export function hasReachedLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}
