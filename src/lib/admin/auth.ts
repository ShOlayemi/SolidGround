import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

export async function requireAdmin(minRole: UserRole = 'admin'): Promise<{
  userId: string;
  role: UserRole;
  email: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const role = profile.role as UserRole;
  const roleRank: Record<UserRole, number> = { admin: 3, moderator: 2, support: 1, user: 0 };
  if (roleRank[role] < roleRank[minRole]) {
    throw new Error("Insufficient permissions");
  }

  return { userId: user.id, role, email: user.email! };
}

export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const rank: Record<UserRole, number> = { admin: 3, moderator: 2, support: 1, user: 0 };
  return rank[userRole] >= rank[requiredRole];
}

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  admin: 'Administrator',
  moderator: 'Moderator',
  support: 'Support',
};
