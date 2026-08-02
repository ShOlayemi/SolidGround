"use server";

import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("already registered") || error.message.includes("already exists")) {
      return { success: false, error: "An account with this email already exists." };
    }
    return { success: false, error: error.message };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://solidground.ai";
  // Supabase sends its native verification message; these branded messages provide a fallback/companion.
  void sendWelcomeEmail(email, fullName.trim());
  void sendVerificationEmail(email, fullName.trim(), `${siteUrl}/auth/callback`);

  return { success: true };
}

export async function signIn(
  email: string,
  password: string,
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
