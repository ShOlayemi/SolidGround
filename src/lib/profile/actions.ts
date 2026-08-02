"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  ProfileUpdatePayload,
  ProfileActionResult,
  Gender,
  RelationshipStatus,
  EducationLevel,
} from "@/types";

const VALID_GENDERS: Gender[] = [
  "male",
  "female",
  "non_binary",
  "prefer_not_to_say",
];
const VALID_RELATIONSHIP_STATUSES: RelationshipStatus[] = [
  "single",
  "dating",
  "engaged",
  "married",
  "divorced",
  "widowed",
  "complicated",
  "prefer_not_to_say",
];
const VALID_EDUCATION_LEVELS: EducationLevel[] = [
  "high_school",
  "some_college",
  "associates",
  "bachelors",
  "masters",
  "doctorate",
  "trade_school",
  "other",
  "prefer_not_to_say",
];

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  payload: ProfileUpdatePayload,
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const userId = session.user.id;

  // Validate full_name (required)
  if (!payload.full_name || payload.full_name.trim().length < 2) {
    return {
      success: false,
      error: "Full name is required and must be at least 2 characters.",
    };
  }

  // Validate gender if provided
  if (
    payload.gender &&
    !VALID_GENDERS.includes(payload.gender as Gender)
  ) {
    return { success: false, error: "Invalid gender value." };
  }

  // Validate relationship_status if provided
  if (
    payload.relationship_status &&
    !VALID_RELATIONSHIP_STATUSES.includes(
      payload.relationship_status as RelationshipStatus,
    )
  ) {
    return { success: false, error: "Invalid relationship status value." };
  }

  // Validate education if provided
  if (
    payload.education &&
    !VALID_EDUCATION_LEVELS.includes(payload.education as EducationLevel)
  ) {
    return { success: false, error: "Invalid education value." };
  }

  // Validate date_of_birth if provided
  if (payload.date_of_birth) {
    const parsed = Date.parse(payload.date_of_birth);
    if (isNaN(parsed)) {
      return { success: false, error: "Invalid date of birth." };
    }
    // Must be at least 18 years old
    const dob = new Date(parsed);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    const isUnder18 =
      age < 18 ||
      (age === 18 && monthDiff < 0) ||
      (age === 18 && monthDiff === 0 && now.getDate() < dob.getDate());
    if (isUnder18) {
      return { success: false, error: "You must be at least 18 years old." };
    }
  }

  // Validate bio length
  if (payload.bio && payload.bio.length > 500) {
    return {
      success: false,
      error: "Bio must be 500 characters or fewer.",
    };
  }

  // Clean payload: convert "" to null for optional fields
  const updateData: Record<string, unknown> = {
    full_name: payload.full_name.trim(),
  };

  const optionalFields: (keyof ProfileUpdatePayload)[] = [
    "display_name",
    "date_of_birth",
    "gender",
    "country",
    "city",
    "relationship_status",
    "education",
    "occupation",
    "bio",
  ];

  for (const field of optionalFields) {
    const value = payload[field];
    updateData[field] =
      value === "" || value === undefined ? null : value;
  }

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (updateError) {
    console.error("Error updating profile:", updateError);
    return { success: false, error: "Failed to update profile. Please try again." };
  }

  // Log to audit_logs
  try {
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: "profile.update",
      resource: "profiles",
      resource_id: userId,
      details: { updated_fields: Object.keys(updateData) },
    });
  } catch (auditError) {
    // Non-fatal — don't fail the request if audit logging fails
    console.error("Audit log error:", auditError);
  }

  return { success: true };
}

export async function updateAvatarUrl(
  avatarUrl: string,
): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { success: false, error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", session.user.id);

  if (error) {
    console.error("Error updating avatar:", error);
    return {
      success: false,
      error: "Failed to update avatar. Please try again.",
    };
  }

  // Log to audit_logs
  try {
    await supabase.from("audit_logs").insert({
      user_id: session.user.id,
      action: "profile.avatar_update",
      resource: "profiles",
      resource_id: session.user.id,
      details: { avatar_url: avatarUrl },
    });
  } catch (auditError) {
    console.error("Audit log error:", auditError);
  }

  return { success: true };
}
