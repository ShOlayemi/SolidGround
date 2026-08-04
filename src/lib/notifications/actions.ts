"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType = "partner_invite" | "invite_accepted" | "connection_request" | "connection_accepted" | "assessment_complete" | "subscription" | "system";
export type Notification = { id: string; user_id: string; type: NotificationType; title: string; message: string; data: Record<string, unknown> | null; read: boolean; created_at: string };
export type NotificationPreferences = { email: Record<string, boolean>; in_app: Record<string, boolean> };

const TYPES: NotificationType[] = ["partner_invite", "invite_accepted", "connection_request", "connection_accepted", "assessment_complete", "subscription", "system"];
const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: Object.fromEntries(TYPES.map((type) => [type, true])),
  in_app: Object.fromEntries(TYPES.map((type) => [type, true])),
};

async function currentUser(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { supabase, userId: session.user.id } : null;
}

export async function getNotifications(userId: string, page = 0, pageSize = 10): Promise<{ success: boolean; unreadCount: number; notifications: Notification[]; error?: string }> {
  const auth = await currentUser();
  if (!auth || auth.userId !== userId) return { success: false, unreadCount: 0, notifications: [], error: "Not authenticated." };
  const { supabase } = auth;
  const [{ data, error }, { count }] = await Promise.all([
    supabase.from("notifications").select("id, user_id, type, title, message, data, read, created_at").eq("user_id", userId).order("created_at", { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
  ]);
  if (error) return { success: false, unreadCount: count ?? 0, notifications: [], error: error.message };
  return { success: true, unreadCount: count ?? 0, notifications: (data ?? []) as Notification[] };
}

export async function markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await currentUser();
  if (!auth) return { success: false, error: "Not authenticated." };
  const { error } = await auth.supabase.from("notifications").update({ read: true }).eq("id", notificationId).eq("user_id", auth.userId);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await currentUser();
  if (!auth || auth.userId !== userId) return { success: false, error: "Not authenticated." };
  const { error } = await auth.supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function createNotification(userId: string, type: NotificationType, title: string, message: string, data?: Record<string, unknown>): Promise<{ success: boolean; notification?: Notification; error?: string }> {
  const auth = await currentUser();
  if (!auth) return { success: false, error: "Not authenticated." };
  const { data: prefs } = await auth.supabase.from("profiles").select("notification_preferences").eq("id", userId).maybeSingle();
  const inApp = (prefs?.notification_preferences as Partial<NotificationPreferences> | null)?.in_app;
  if (inApp && inApp[type] === false) return { success: true };
  if (userId !== auth.userId) {
    const { data: notificationId, error } = await auth.supabase.rpc("create_notification_for_user", { target_user_id: userId, notification_type: type, notification_title: title, notification_message: message, notification_data: data ?? null });
    return error ? { success: false, error: error.message } : { success: true, ...(notificationId ? { notification: { id: notificationId } as Notification } : {}) };
  }
  const { data: notification, error } = await auth.supabase.from("notifications").insert({ user_id: userId, type, title, message, data: data ?? null }).select("id, user_id, type, title, message, data, read, created_at").single();
  return error ? { success: false, error: error.message } : { success: true, notification: notification as Notification };
}

export async function getNotificationPreferences(userId: string): Promise<{ success: boolean; preferences: NotificationPreferences; error?: string }> {
  const auth = await currentUser();
  if (!auth || auth.userId !== userId) return { success: false, preferences: DEFAULT_PREFERENCES, error: "Not authenticated." };
  const { data, error } = await auth.supabase.from("profiles").select("notification_preferences").eq("id", userId).single();
  if (error) return { success: false, preferences: DEFAULT_PREFERENCES, error: error.message };
  const stored = (data.notification_preferences ?? {}) as Partial<NotificationPreferences>;
  return { success: true, preferences: { email: { ...DEFAULT_PREFERENCES.email, ...(stored.email ?? {}) }, in_app: { ...DEFAULT_PREFERENCES.in_app, ...(stored.in_app ?? {}) } } };
}

export async function updateNotificationPreferences(userId: string, preferences: NotificationPreferences): Promise<{ success: boolean; error?: string }> {
  const auth = await currentUser();
  if (!auth || auth.userId !== userId) return { success: false, error: "Not authenticated." };
  const safe: NotificationPreferences = { email: { ...DEFAULT_PREFERENCES.email, ...preferences.email }, in_app: { ...DEFAULT_PREFERENCES.in_app, ...preferences.in_app } };
  const { error } = await auth.supabase.from("profiles").update({ notification_preferences: safe }).eq("id", userId);
  return error ? { success: false, error: error.message } : { success: true };
}
