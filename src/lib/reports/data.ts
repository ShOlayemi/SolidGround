import { createClient } from "@/lib/supabase/server";
import type { BlueprintResults } from "@/lib/scoring/types";
import type { AlignmentResults, ComparisonReport } from "@/types";

export async function reportContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("display_name, full_name").eq("id", user.id).maybeSingle();
  const { data: session } = await supabase.from("assessment_sessions").select("id, status").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!session) return { supabase, userId: user.id, name: profile?.display_name ?? profile?.full_name ?? "Your profile", results: null };
  const { data: row } = await supabase.from("blueprint_results").select("session_id, user_id, category_results, overall_score, overall_confidence, created_at, updated_at").eq("session_id", session.id).eq("user_id", user.id).maybeSingle();
  const results: BlueprintResults | null = row ? { sessionId: row.session_id, userId: row.user_id, categoryResults: row.category_results, overallScore: row.overall_score, overallConfidence: row.overall_confidence, completedAt: row.updated_at ?? row.created_at } : null;
  return { supabase, userId: user.id, name: profile?.display_name ?? profile?.full_name ?? "Your profile", sessionId: session.id, results };
}
export async function comparisonContext(pairingId: string) {
  const ctx = await reportContext();
  if (!ctx) return null;
  const { data: pairing } = await ctx.supabase.from("pairings").select("id, inviter_user_id, invitee_user_id, inviter_session_id, status, alignment_results").eq("id", pairingId).or(`inviter_user_id.eq.${ctx.userId},invitee_user_id.eq.${ctx.userId}`).maybeSingle();
  if (!pairing || !pairing.invitee_user_id || !pairing.alignment_results) return { ...ctx, pairing: null };
  const { data: names } = await ctx.supabase.from("profiles").select("id, display_name, full_name").in("id", [pairing.inviter_user_id, pairing.invitee_user_id]);
  const nameOf = (id: string) => names?.find(n => n.id === id)?.display_name ?? names?.find(n => n.id === id)?.full_name ?? "Partner";
  const { data: reportRow } = await ctx.supabase.from("comparison_reports").select("pairing_id, overall_compatibility, category_comparisons, shared_strengths, potential_conflicts, conversation_guides, growth_opportunities, deal_breaker_intersections").eq("pairing_id", pairingId).maybeSingle();
  const report: ComparisonReport | null = reportRow ? { pairingId: reportRow.pairing_id, overallCompatibility: reportRow.overall_compatibility, categoryComparisons: reportRow.category_comparisons, sharedStrengths: reportRow.shared_strengths, potentialConflicts: reportRow.potential_conflicts, conversationGuides: reportRow.conversation_guides, growthOpportunities: reportRow.growth_opportunities, dealBreakerIntersections: reportRow.deal_breaker_intersections } : null;
  return { ...ctx, pairing: { ...pairing, inviterName: nameOf(pairing.inviter_user_id), inviteeName: nameOf(pairing.invitee_user_id), alignment: pairing.alignment_results as AlignmentResults, report } };
}
