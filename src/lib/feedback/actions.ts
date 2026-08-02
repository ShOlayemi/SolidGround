"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  FEEDBACK_TYPES,
  FEEDBACK_STATUSES,
  type FeedbackType,
  type FeedbackStatus,
} from "./constants";
import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────
export type { FeedbackType, FeedbackStatus } from "./constants";

export interface Feedback {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  rating: number | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: FeedbackStatus;
  created_at: string;
}

export interface FeedbackPage {
  items: Feedback[];
  total: number;
  page: number;
  pageSize: number;
}

function isFeedbackType(value: string): value is FeedbackType {
  return (FEEDBACK_TYPES as string[]).includes(value);
}

function isFeedbackStatus(value: string): value is FeedbackStatus {
  return (FEEDBACK_STATUSES as string[]).includes(value);
}

async function currentUser(): Promise<{
  supabase: SupabaseClient;
  userId: string;
  userEmail: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return {
    supabase,
    userId: session.user.id,
    userEmail: session.user.email ?? "",
  };
}

// ── Submit ────────────────────────────────────────────────────
export async function submitFeedback(
  userId: string | null,
  type: FeedbackType,
  title: string,
  description: string,
  rating?: number | null,
  metadata?: Record<string, unknown> | null,
): Promise<{ success: boolean; feedback?: Feedback; error?: string }> {
  const auth = await currentUser();
  if (!auth) return { success: false, error: "Not authenticated." };
  if (userId && userId !== auth.userId) {
    return { success: false, error: "Not authorized." };
  }
  if (!isFeedbackType(type)) {
    return { success: false, error: "Invalid feedback type." };
  }
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  if (!cleanTitle && !cleanDescription) {
    return { success: false, error: "Please add a title or a description." };
  }
  if (
    rating !== undefined &&
    rating !== null &&
    (!Number.isInteger(rating) || rating < 0 || rating > 10)
  ) {
    return { success: false, error: "Rating must be a whole number between 0 and 10." };
  }

  // Attach the user's email server-side so admins can identify the author
  // (profiles RLS prevents admins from reading other users' profiles directly).
  const safeMetadata = {
    user_email: auth.userEmail || null,
    ...(metadata ?? {}),
  };

  const { data, error } = await auth.supabase
    .from("feedback")
    .insert({
      user_id: userId,
      type,
      rating: rating ?? null,
      title: cleanTitle || null,
      description: cleanDescription || null,
      metadata: safeMetadata,
    })
    .select("id, user_id, type, rating, title, description, metadata, status, created_at")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, feedback: data as Feedback };
}

// ── User history ──────────────────────────────────────────────
export async function getMyFeedback(
  userId: string,
): Promise<{ success: boolean; feedback: Feedback[]; error?: string }> {
  const auth = await currentUser();
  if (!auth || auth.userId !== userId) {
    return { success: false, feedback: [], error: "Not authenticated." };
  }
  const { data, error } = await auth.supabase
    .from("feedback")
    .select("id, user_id, type, rating, title, description, metadata, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { success: false, feedback: [], error: error.message };
  return { success: true, feedback: (data ?? []) as Feedback[] };
}

// ── Admin: all feedback (paginated, filterable) ───────────────
export async function getAllFeedback(
  page = 0,
  pageSize = 10,
  type?: FeedbackType | "all",
  status?: FeedbackStatus | "all",
): Promise<{ success: boolean; page?: FeedbackPage; error?: string }> {
  try {
    await requireAdmin("support");
  } catch {
    return { success: false, error: "Not authorized." };
  }
  const supabase = await createClient();
  const safePage = Math.max(0, Math.floor(page) || 0);
  const safePageSize = Math.min(50, Math.max(1, Math.floor(pageSize) || 10));

  let query = supabase.from("feedback").select("id, user_id, type, rating, title, description, metadata, status, created_at", { count: "exact" });
  if (type && type !== "all" && isFeedbackType(type)) {
    query = query.eq("type", type);
  }
  if (status && status !== "all" && isFeedbackStatus(status)) {
    query = query.eq("status", status);
  }
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(safePage * safePageSize, safePage * safePageSize + safePageSize - 1);

  if (error) return { success: false, error: error.message };
  return {
    success: true,
    page: {
      items: (data ?? []) as Feedback[],
      total: count ?? 0,
      page: safePage,
      pageSize: safePageSize,
    },
  };
}

// ── Admin: status changes ─────────────────────────────────────
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin("support");
  } catch {
    return { success: false, error: "Not authorized." };
  }
  if (!isFeedbackStatus(status)) {
    return { success: false, error: "Invalid status." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", feedbackId);
  return error ? { success: false, error: error.message } : { success: true };
}

// ── NPS eligibility: one response per user ────────────────────
export async function getNPSEligibility(
  userId: string,
): Promise<{ success: boolean; eligible: boolean; error?: string }> {
  const auth = await currentUser();
  if (!auth || auth.userId !== userId) {
    return { success: false, eligible: false, error: "Not authenticated." };
  }
  const { count, error } = await auth.supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "nps");
  if (error) return { success: false, eligible: false, error: error.message };
  return { success: true, eligible: (count ?? 0) === 0 };
}

// ── Admin: open (new) feedback count for sidebar badge ────────
export async function getNewFeedbackCount(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    await requireAdmin("support");
  } catch {
    return { success: false, count: 0, error: "Not authorized." };
  }
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return error
    ? { success: false, count: 0, error: error.message }
    : { success: true, count: count ?? 0 };
}
