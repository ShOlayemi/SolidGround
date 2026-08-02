import { LegalPage, LegalSection } from '@/components/LegalPage'; import { createClient } from '@/lib/supabase/server'; import { DeleteForm } from './DeleteForm';
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "Permanently delete your SolidGround AI account and data.",
};
export default async function DeletePage(){const {data:{user}}=await (await createClient()).auth.getUser(); return <LegalPage title="Delete my data" eyebrow="Your data, your choice" nested><p>You can permanently delete your SolidGround account and associated personal data. This cannot be undone.</p><LegalSection title="What will be deleted"><p>Your profile, assessment responses and sessions, Blueprint results, AI Insights, pairings and comparison reports, and partner messages will be deleted. Billing records may be retained where required by tax, accounting, or fraud-prevention law. Backups may take a limited period to cycle out.</p></LegalSection>{user?<DeleteForm/>:<p className="rounded-lg bg-indigo-50 p-4 text-indigo-900">Please <a href="/login">sign in</a> to request deletion.</p>}</LegalPage>}
