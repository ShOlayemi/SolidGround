import { LegalPage } from '@/components/LegalPage';
import { createClient } from '@/lib/supabase/server';
import { GdprConsentForm } from './GdprConsentForm';
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "GDPR & Data Rights",
  description: "Your GDPR rights and how to exercise them with SolidGround AI.",
};
export const revalidate = 86400;
export default async function GdprPage(){const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); let initial:Record<string,boolean>={assessment:true,ai:true,analytics:false}; if(user){const {data}=await supabase.from('profiles').select('gdpr_consent').eq('id',user.id).single(); const consent=(data?.gdpr_consent??{}) as Record<string,{granted?:boolean}>; initial={assessment:consent.assessment?.granted??true,ai:consent.ai?.granted??true,analytics:consent.analytics?.granted??false};} return <LegalPage title="Privacy choices" eyebrow="GDPR consent" nested><p>Choose how SolidGround may process your information. Essential processing is required to provide an account. You can change optional choices at any time.</p>{user?<GdprConsentForm initial={initial}/>:<p className="rounded-lg bg-indigo-50 p-4 text-indigo-900">Please <a href="/login">sign in</a> to save consent preferences.</p>}<p className="mt-8 text-sm text-slate-500">You may also request access, correction, portability, or deletion of your data.</p></LegalPage>}
