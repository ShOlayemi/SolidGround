'use server';
import { createClient } from '@/lib/supabase/server';
export async function saveConsent(values: Record<string, boolean>) { const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return {error:'Please sign in to manage preferences.'}; const consent=Object.fromEntries(Object.entries(values).map(([key, granted])=>[key,{granted,updated_at:new Date().toISOString()}])); const {error}=await supabase.from('profiles').update({gdpr_consent:consent}).eq('id',user.id); return {error:error?.message ?? null}; }
