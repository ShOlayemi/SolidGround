import { createClient } from "@/lib/supabase/server";
import { getSubscription, getUsageStats } from "./actions";
import { getPlan, PLANS } from "./plans";
import { canAccess, type FeatureName } from "./gate";
import type { PlanDefinition } from "@/types";

async function currentPlan(): Promise<PlanDefinition> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const subscription = user ? await getSubscription(user.id) : null;
  return subscription ? getPlan(subscription.planTier) : PLANS.free;
}

export async function checkAccess(feature: FeatureName): Promise<{ allowed: boolean; plan: PlanDefinition; reason?: string }> {
  const plan = await currentPlan();
  const allowed = canAccess(plan, feature);
  return { allowed, plan, reason: allowed ? undefined : `${plan.name} plan required for this feature.` };
}

export async function checkBlueprintLimit(): Promise<{ allowed: boolean; current: number; limit: number; plan: PlanDefinition }> {
  const [stats, plan] = await Promise.all([getUsageStats(), currentPlan()]);
  const limit = plan.limits.blueprintCount;
  return { allowed: limit === -1 || stats.blueprintsCompleted < limit, current: stats.blueprintsCompleted, limit, plan };
}
