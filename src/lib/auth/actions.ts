"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email/send";

interface AuthResult {
  success: boolean;
  error?: string;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  redirectPath?: string,
  gender?: "male" | "female" | "other",
  age?: number,
): Promise<AuthResult> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (!password || password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: "Please enter your full name." };
  }

  if (gender && !["male", "female", "other"].includes(gender)) {
    return { success: false, error: "Invalid gender value." };
  }

  if (age !== undefined && (!Number.isInteger(age) || age < 18 || age > 120)) {
    return { success: false, error: "Age must be between 18 and 120." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        ...(gender ? { gender } : {}),
        ...(age !== undefined ? { age } : {}),
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback${redirectPath ? `?next=${encodeURIComponent(redirectPath)}` : ""}`,
    },
  });

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return { success: false, error: "An account with this email already exists." };
    }
    return { success: false, error: error.message };
  }

  // The profile trigger copies the full name from Auth metadata. Apply the
  // optional discovery fields after signup so older triggers remain compatible.
  if (data.user && (gender !== undefined || age !== undefined)) {
    const serviceClient = await createServiceClient();
    const profileFields = {
      id: data.user.id,
      full_name: fullName.trim(),
      ...(gender !== undefined ? { gender } : {}),
      ...(age !== undefined ? { age } : {}),
    };
    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert(profileFields, { onConflict: "id" });
    if (profileError) {
      console.error("Error saving signup profile fields:", profileError);
      return { success: false, error: "Your account was created, but profile details could not be saved." };
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://solidground.ai";
  // Supabase sends its native verification message; these branded messages provide a fallback/companion.
  // Preserve the requested destination in the branded link too. Otherwise users who
  // verify through this message lose their invite code and land on /dashboard.
  const verificationNext = redirectPath
    ? `?next=${encodeURIComponent(redirectPath)}`
    : "";
  void sendWelcomeEmail(email, fullName.trim());
  void sendVerificationEmail(
    email,
    fullName.trim(),
    `${siteUrl}/auth/callback${verificationNext}`,
  );

  return { success: true };
}

export async function signIn(
  email: string,
  password: string,
  _redirectPath?: string,
): Promise<AuthResult> {
  if (!email || !password) {
    return { success: false, error: "Please enter your email and password." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { success: false, error: "Invalid email or password." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { success: false, error: "Please verify your email before signing in." };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resetPassword(email: string): Promise<AuthResult> {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Supabase's reset email remains the primary flow; this branded email is a fallback/companion.
  void sendPasswordResetEmail(email, email.split("@")[0] || "there", `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://solidground.ai"}/reset-password`);
  return { success: true };
}

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}
