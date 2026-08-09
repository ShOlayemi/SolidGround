"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/actions";
import { computeAlignment, generateComparisonReport } from "@/lib/pairings/alignment";
import type { BlueprintResults } from "@/lib/scoring/types";
import type { RelationshipType } from "@/types";

type Result<T> = { success: boolean; error?: string } & T;
export type ConnectionRequest = { id: string; from_user_id: string; to_user_id: string; status: "pending" | "accepted" | "declined"; created_at: string; updated_at: string; from_name?: string; to_name?: string };

async function auth() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { supabase, userId: session.user.id } : null;
}
async function latestResults(client: Awaited<ReturnType<typeof createServiceClient>>, userId: string) {
  const { data: session } = await client.from("assessment_sessions").select("id").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle();
  if (!session) return null;
  const { data } = await client.from("blueprint_results").select("session_id,user_id,category_results,overall_score,overall_confidence,created_at,updated_at").eq("session_id", session.id).eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return { sessionId: data.session_id, userId: data.user_id, categoryResults: data.category_results, overallScore: data.overall_score, overallConfidence: data.overall_confidence, completedAt: data.updated_at ?? data.created_at } as BlueprintResults;
}

export type DiscoverUser = { id: string; display_name: string; full_name: string; relationship_status: string | null; gender: "male" | "female" | "other" | null; age: number | null; avatar_url: string | null; bio: string | null; hasPending: boolean; incomingPending: boolean };
export async function discoverUsers(query = "", page = 0): Promise<Result<{ users: DiscoverUser[]; hasMore: boolean }>> {
  const a = await auth(); if (!a) return { success: false, users: [], hasMore: false, error: "Not authenticated." };
  const service = await createServiceClient();
  const { data: completed } = await service.from("blueprint_results").select("user_id");
  const ids = [...new Set((completed ?? []).map((x) => x.user_id).filter((id) => id !== a.userId))];
  if (!ids.length) return { success: true, users: [], hasMore: false };
  const { data: pairings } = await service.from("pairings").select("inviter_user_id,invitee_user_id").or(`inviter_user_id.eq.${a.userId},invitee_user_id.eq.${a.userId}`);
  const paired = new Set((pairings ?? []).flatMap((p) => [p.inviter_user_id, p.invitee_user_id]).filter(Boolean));
  const eligible = ids.filter((id) => !paired.has(id));
  const { data: profiles } = await service.from("profiles").select("id,display_name,full_name,relationship_status,gender,age,avatar_url,bio").in("id", eligible);
  const { data: requests } = await service.from("connection_requests").select("from_user_id,to_user_id").eq("status", "pending").or(`from_user_id.eq.${a.userId},to_user_id.eq.${a.userId}`);
  const reqs = requests ?? [];
  const term = query.trim().toLowerCase();
  const filtered = (profiles ?? []).filter((p) => !term || [p.display_name, p.full_name].some((v) => (v ?? "").toLowerCase().includes(term))).sort((x, y) => (x.display_name ?? x.full_name).localeCompare(y.display_name ?? y.full_name));
  const start = page * 20; const slice = filtered.slice(start, start + 20);
  return { success: true, users: slice.map((p) => { const outgoing = reqs.some((r) => r.from_user_id === a.userId && r.to_user_id === p.id); return { ...p, display_name: p.display_name ?? p.full_name, hasPending: outgoing, incomingPending: reqs.some((r) => r.from_user_id === p.id && r.to_user_id === a.userId) }; }), hasMore: start + 20 < filtered.length };
}

export async function sendConnectionRequest(toUserId: string, relationshipType: RelationshipType = "romantic"): Promise<Result<{}>> {
  const a = await auth(); if (!a) return { success: false, error: "Not authenticated." }; if (toUserId === a.userId) return { success: false, error: "You cannot connect with yourself." };
  const service = await createServiceClient();
  const { data: existing } = await service.from("connection_requests").select("id,status").or(`and(from_user_id.eq.${a.userId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${a.userId})`).eq("status", "pending").maybeSingle();
  if (existing) return { success: false, error: "A request is already pending." };
  const { error } = await service.from("connection_requests").insert({ from_user_id: a.userId, to_user_id: toUserId, relationship_type: relationshipType });
  if (error) return { success: false, error: error.message };
  const { data: profile } = await service.from("profiles").select("display_name,full_name").eq("id", a.userId).maybeSingle();
  const name = profile?.display_name ?? profile?.full_name ?? "Someone";
  await createNotification(toUserId, "connection_request", "New connection request", `${name} would like to connect with you.`, { from_user_id: a.userId, href: "/dashboard/requests" });
  return { success: true };
}

export async function getConnectionRequests(): Promise<Result<{ incoming: ConnectionRequest[]; outgoing: ConnectionRequest[]; unreadCount: number }>> {
  const a = await auth(); if (!a) return { success: false, incoming: [], outgoing: [], unreadCount: 0, error: "Not authenticated." };
  const service = await createServiceClient();
  const { data, error } = await service.from("connection_requests").select("id,from_user_id,to_user_id,status,created_at,updated_at").or(`from_user_id.eq.${a.userId},to_user_id.eq.${a.userId}`).order("created_at", { ascending: false });
  if (error) return { success: false, incoming: [], outgoing: [], unreadCount: 0, error: error.message };
  const rows = data ?? []; const ids = [...new Set(rows.flatMap((r) => [r.from_user_id, r.to_user_id]))]; const { data: profiles } = await service.from("profiles").select("id,display_name,full_name").in("id", ids); const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.full_name]));
  const decorate = (r: typeof rows[number]) => ({ ...r, from_name: names.get(r.from_user_id), to_name: names.get(r.to_user_id) });
  return { success: true, incoming: rows.filter((r) => r.to_user_id === a.userId && r.status === "pending").map(decorate), outgoing: rows.filter((r) => r.from_user_id === a.userId && r.status === "pending").map(decorate), unreadCount: rows.filter((r) => r.to_user_id === a.userId && r.status === "pending").length };
}

export async function respondToConnectionRequest(requestId: string, accept: boolean): Promise<Result<{ pairingId?: string }>> {
  const a = await auth(); if (!a) return { success: false, error: "Not authenticated." };
  const service = await createServiceClient(); const { data: req } = await service.from("connection_requests").select("id,from_user_id,to_user_id,status,relationship_type").eq("id", requestId).eq("to_user_id", a.userId).single();
  if (!req || req.status !== "pending") return { success: false, error: "Request not found or already handled." };
  const status = accept ? "accepted" : "declined"; const { error } = await service.from("connection_requests").update({ status }).eq("id", requestId); if (error) return { success: false, error: error.message };
  if (!accept) return { success: true };
  const relationshipType: RelationshipType = (req.relationship_type === "platonic" ? "platonic" : "romantic");
  const [fromResults, toResults] = await Promise.all([latestResults(service, req.from_user_id), latestResults(service, req.to_user_id)]); if (!fromResults || !toResults) return { success: false, error: "Both users must have completed their Blueprint." };
  const alignmentResults = computeAlignment(fromResults, toResults);
  const { data: pairing, error: pairingError } = await service.from("pairings").insert({ invite_code: crypto.randomUUID().slice(0, 8), inviter_user_id: req.from_user_id, inviter_session_id: fromResults.sessionId, invitee_user_id: req.to_user_id, invitee_session_id: toResults.sessionId, status: "completed", relationship_type: relationshipType, alignment_results: alignmentResults }).select("id").single();
  if (pairingError || !pairing) return { success: false, error: pairingError?.message ?? "Failed to create pairing." };

  // Generate the report after pairing creation; a report failure must not undo acceptance.
  try {
    const report = generateComparisonReport(pairing.id, fromResults, toResults);
    await service.from("comparison_reports").upsert({
      pairing_id: pairing.id,
      overall_compatibility: report.overallCompatibility,
      category_comparisons: report.categoryComparisons,
      shared_strengths: report.sharedStrengths,
      potential_conflicts: report.potentialConflicts,
      conversation_guides: report.conversationGuides,
      growth_opportunities: report.growthOpportunities,
      deal_breaker_intersections: report.dealBreakerIntersections,
    }, { onConflict: "pairing_id" });
  } catch (error) {
    console.error("Failed to save comparison report:", error);
  }

  await createNotification(req.from_user_id, "connection_accepted", "Connection accepted", "Your connection request was accepted. Your Alignment Match is ready.", { pairing_id: pairing.id, href: `/dashboard/pairings/${pairing.id}` });
  return { success: true, pairingId: pairing.id };
}

export async function cancelConnectionRequest(requestId: string): Promise<Result<{}>> { const a = await auth(); if (!a) return { success: false, error: "Not authenticated." }; const { error } = await a.supabase.from("connection_requests").delete().eq("id", requestId).eq("from_user_id", a.userId); return error ? { success: false, error: error.message } : { success: true }; }
