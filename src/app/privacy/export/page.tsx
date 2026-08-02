import { LegalPage, LegalSection } from '@/components/LegalPage'; import { createClient } from '@/lib/supabase/server'; import { ExportForm } from './ExportForm';
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Export Your Data",
  description: "Request a copy of your SolidGround AI data.",
};
export default async function ExportPage(){const {data:{user}}=await (await createClient()).auth.getUser();return <LegalPage title="Export my data" eyebrow="Data portability" nested><p>Download a machine-readable JSON copy of the personal data associated with your account.</p><LegalSection title="Included in your export"><p>Your account and profile, assessment sessions and answers, Blueprint results, pairings, comparison reports, partner messages, and AI Insights are included where available. The export is generated on request and delivered directly to your browser.</p></LegalSection>{user?<ExportForm/>:<p className="rounded-lg bg-indigo-50 p-4 text-indigo-900">Please <a href="/login">sign in</a> to export your data.</p>}</LegalPage>}
