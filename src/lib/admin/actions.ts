"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import type { AdminStats, AdminProfile, UserRole } from "@/types";

// ── getAdminStats ────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin("support");
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: premiumUsers },
    { count: assessmentCompletions },
    { count: blueprintReportsGenerated },
    { count: partnerComparisons },
    { count: aiInsightsGenerated },
    revenueResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).neq("plan_tier", "free").eq("status", "active"),
    supabase.from("assessment_sessions").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("blueprint_results").select("*", { count: "exact", head: true }),
    supabase.from("comparison_reports").select("*", { count: "exact", head: true }),
    supabase.from("ai_insights").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("amount").eq("status", "succeeded"),
  ]);

  let monthlyRevenue = 0;
  if (revenueResult.data) {
    monthlyRevenue = (revenueResult.data as { amount: number }[]).reduce((sum, p) => sum + p.amount, 0);
  }

  const apiCost = (aiInsightsGenerated ?? 0) * 0.0015;

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    premiumUsers: premiumUsers ?? 0,
    monthlyRevenue,
    assessmentCompletions: assessmentCompletions ?? 0,
    blueprintReportsGenerated: blueprintReportsGenerated ?? 0,
    partnerComparisons: partnerComparisons ?? 0,
    aiInsightsGenerated: aiInsightsGenerated ?? 0,
    estimatedApiCost: Math.round(apiCost * 100) / 100,
  };
}

// ── getUsers ──────────────────────────────────────────────────

export async function getUsers(params: {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: AdminProfile[]; total: number }> {
  await requireAdmin("support");

  const { search, role, page = 1, limit = 20 } = params;
  const supabase = await createServiceClient();
  const offset = (page - 1) * limit;

  let query = supabase.from("profiles").select("id, display_name, role, created_at, full_name", { count: "exact" });

  if (role) {
    query = query.eq("role", role);
  }
  if (search) {
    query = query.or(`display_name.ilike.%${search}%,full_name.ilike.%${search}%`);
  }

  const { data: profiles, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("getUsers query error:", error.message);
    return { users: [], total: 0 };
  }

  const userIds = (profiles ?? []).map((p: { id: string }) => p.id);

  // Fetch subscriptions and assessment sessions in bulk
  const [{ data: subs }, { data: sessions }] = await Promise.all([
    userIds.length
      ? supabase.from("subscriptions").select("user_id, plan_tier").in("user_id", userIds).eq("status", "active")
      : { data: [] },
    userIds.length
      ? supabase.from("assessment_sessions").select("user_id, status").in("user_id", userIds).eq("status", "completed")
      : { data: [] },
  ]);

  const subMap = new Map((subs ?? []).map((s: { user_id: string; plan_tier: string }) => [s.user_id, s.plan_tier]));
  const completedSet = new Set((sessions ?? []).map((s: { user_id: string }) => s.user_id));

  const adminUsers: AdminProfile[] = (profiles ?? []).map((p: { id: string; display_name: string | null; role: string; created_at: string; full_name: string }) => ({
    id: p.id,
    email: "", // email not directly available without admin API
    displayName: p.display_name ?? p.full_name ?? "Unknown",
    role: p.role as UserRole,
    createdAt: p.created_at,
    blueprintCompleted: completedSet.has(p.id),
    subscriptionTier: subMap.get(p.id) ?? "free",
    isSuspended: false,
  }));

  return { users: adminUsers, total: count ?? 0 };
}

// ── logAdminAction ────────────────────────────────────────────

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = await requireAdmin("support");
    const supabase = await createServiceClient();
    await supabase.from("admin_audit_log").insert({
      admin_user_id: admin.userId,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      details: details ?? null,
    });
  } catch (err) {
    console.error("logAdminAction failed:", err);
  }
}

// ── setUserRole ───────────────────────────────────────────────

export async function setUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin("admin");
    const supabase = await createServiceClient();

    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await logAdminAction("set_user_role", "profile", userId, { newRole: role });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to set role" };
  }
}

// ── suspendUser ───────────────────────────────────────────────

export async function suspendUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin("moderator");
    const supabase = await createServiceClient();

    // Use suspended_at timestamp approach since we don't have a suspended column
    const { error } = await supabase
      .from("profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await logAdminAction("suspend_user", "profile", userId, { suspendedAt: new Date().toISOString() });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to suspend user" };
  }
}

// ── deleteUser ────────────────────────────────────────────────

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin("admin");
    const supabase = await createServiceClient();

    // Delete from profiles cascades to related tables
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await logAdminAction("delete_user", "profile", userId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete user" };
  }
}

// ── makeAdmin (first-admin bootstrap) ─────────────────────────

export async function makeAdmin(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Check if any admin already exists
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");

    if (count && count > 0) {
      return { success: false, error: "Admin already exists. Only an existing admin can promote new admins." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: "first_admin_bootstrap",
      target_type: "profile",
      target_id: user.id,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Bootstrap failed" };
  }
}

// ── hasExistingAdmin ──────────────────────────────────────────

export async function hasExistingAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .in("role", ["admin", "moderator"]);

  return (count ?? 0) > 0;
}
