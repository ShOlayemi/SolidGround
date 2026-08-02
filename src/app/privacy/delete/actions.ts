'use server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
export async function deleteMyData() { const auth=await createClient(); const {data:{user}}=await auth.auth.getUser(); if(!user) return {error:'Please sign in first.'}; const admin=createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!); const {error}=await admin.auth.admin.deleteUser(user.id); if(error) return {error:'We could not complete deletion. Please try again.'}; return {success:true}; }
