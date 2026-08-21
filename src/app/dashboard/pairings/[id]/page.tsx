// ──────────────────────────────────────────────────────────────
// SolidGround AI — Pairwise Alignment Match™ Comparison Page
// ──────────────────────────────────────────────────────────────

import { redirect } from "next/navigation";
import Link from "next/link";
import { getPairingResults, getComparisonReport } from "@/lib/pairings/actions";
import { createClient } from "@/lib/supabase/server";
import { ChatPanelLazy } from "@/components/chat/ChatPanelLazy";
import { MessageCircle, ShieldAlert, Sprout, Swords } from "lucide-react";
import type { ComparisonReport, ConflictItem, ConversationGuide, GrowthOpportunity, DealBreakerIntersection } from "@/types";
import { getQuestionById } from "@/lib/assessment/questions";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/assessment/ScoreRing";
import type { AlignmentResults, CategoryAlignment } from "@/types";
import type { ReactNode } from "react";
import { checkAccess } from "@/lib/billing/middleware";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { DownloadPdfButton } from "@/components/dashboard/DownloadPdfButton";
import { RefreshReportButton } from "@/components/dashboard/RefreshReportButton";
import { partnerLabel } from "@/lib/mode";
import { isPartnerDeletedPairing } from "@/lib/pairings/pairingDeleted";
import { ReportUserButton } from "@/components/trust/ReportUserButton";

interface ComparisonPageProps {
  params: Promise<{ id: string }>;
}

function alignmentColor(score: number): string {
  if (score >= 70) return "#2E4A3A";
  if (score >= 40) return "#C4943A";
  return "#C44E4E";
}

function alignmentLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 40) return "Moderate";
  return "Weak";
}

import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Alignment Match™",
  description: "Side-by-side compatibility comparison with your partner.",
};
export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { id } = await params;
  const access = await checkAccess("partnerComparison");
  if (!access.allowed) return <div className="max-w-[640px] mx-auto py-20 px-4"><UpgradePrompt feature="Partner Comparison" /></div>;

  const result = await getPairingResults(id);

  if (!result.success) {
    if (result.error === "Not authenticated.") {
      redirect("/login");
    }

    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          Pairing not found
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          {result.error ?? "Something went wrong."}
        </p>
        <Link href="/dashboard/pairings">
          <Button variant="filled" size="md">
            ← Back to Pairings
          </Button>
        </Link>
      </div>
    );
  }

  const pairing = result.pairing!;
  const reportResult = await getComparisonReport(id);
  const report = reportResult.success ? reportResult.report : null;

  // Determine current user's role
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isInviter = user?.id === pairing.inviter_user_id;
  const inviteCode = pairing.invite_code;

  // Sprint 8 live-test fix: the other participant deleted their account.
  // pairings.invitee_user_id is ON DELETE SET NULL (migration 008), so a
  // completed/accepted pairing survives the deletion with invitee_user_id
  // null and its comparison report survives with it. Never render that
  // leftover row as an active Alignment Match™ (the report embeds the
  // deleted user's data) — show the truthful defunct state instead.
  if (isPartnerDeletedPairing(pairing)) {
    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          Connection no longer active
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          Your partner deleted their account, so this Alignment Match™ is no
          longer available.
        </p>
        <Link href="/dashboard/pairings">
          <Button variant="filled" size="md">
            ← Back to Pairings
          </Button>
        </Link>
      </div>
    );
  }

  if (pairing.status !== "completed" || !pairing.alignment_results) {
    return (
      <div className="max-w-[640px] mx-auto py-20 px-4 text-center">
        <h1 className="text-[24px] font-semibold text-solid-text mb-3">
          Results pending
        </h1>
        <p className="text-[15px] text-solid-text-secondary mb-6">
          {pairing.status === "pending"
            ? (isInviter
                ? "Waiting for your partner to accept the invite."
                : "Your pairing hasn't been accepted yet.")
            : "Alignment results are being computed."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isInviter && pairing.status === "pending" && (
            <Link href={`/invite/${inviteCode}`}>
              <Button variant="filled" size="md">
                Accept Invite →
              </Button>
            </Link>
          )}
          <Link href="/dashboard/pairings">
            <Button variant="ghost" size="md">
              ← Back to Pairings
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const alignment = pairing.alignment_results;
  // The signed-in user is always "You"; the other party is "Partner".
  // `isInviter` tells us which side the viewer sits on, so we resolve the
  // display names/scores relative to the viewer (previously the invitee was
  // unconditionally treated as "Partner", swapping the labels for invitees).
  const defaultPartnerLabel = partnerLabel(pairing.relationship_type);
  const partnerName = isInviter
    ? (pairing.invitee_name ?? pairing.inviter_name ?? defaultPartnerLabel)
    : (pairing.inviter_name ?? pairing.invitee_name ?? defaultPartnerLabel);
  const partnerAvatarUrl = isInviter ? pairing.invitee_avatar_url : pairing.inviter_avatar_url;
  const currentUserName = isInviter
    ? pairing.inviter_name
    : (pairing.invitee_name ?? pairing.inviter_name);
  // The user being reported is always the OTHER participant (the partner).
  const reportedUserId = isInviter
    ? (pairing.invitee_user_id ?? null)
    : (pairing.inviter_user_id ?? null);

  // Determine whose results are whose: current user is either inviter or invitee
  // For display, we show "You" on the left and partner on the right
  // The alignment results have symmetric category data

  return (
    <div className="max-w-[960px] mx-auto py-8 md:py-10 px-4">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="text-center mb-14">
        <div className="mb-2 flex items-center justify-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-accent-100 text-center text-lg font-semibold leading-10 text-accent-700">
            {partnerAvatarUrl ? <img src={partnerAvatarUrl} alt={`${partnerName}'s profile`} className="h-full w-full object-cover" /> : partnerName.trim().charAt(0).toUpperCase()}
          </div>
          <h1 className="text-[24px] md:text-[32px] leading-[1.15] font-semibold tracking-tight text-solid-text">
            You &amp; {partnerName}
          </h1>
        </div>
        <p className="text-[15px] text-solid-text-secondary mb-10">
          Alignment Match™
        </p>
        <div className="flex justify-center">
          <ScoreRing
            score={alignment.overallAlignment}
            size="lg"
            label={alignmentLabel(alignment.overallAlignment)}
          />
        </div>
        <div className="mt-6 flex justify-center"><DownloadPdfButton endpoint={`/api/reports/comparison?pairingId=${id}`} /></div>
        <p className="text-[14px] text-solid-text-tertiary mt-4 max-w-[400px] mx-auto">
          {alignment.overallAlignment >= 70
            ? "You share strong compatibility across most categories. Your values and communication styles align well."
            : alignment.overallAlignment >= 40
              ? "You have moderate compatibility with some areas of strength and some differences worth discussing."
              : "You have significant differences in key areas. These aren't necessarily deal-breakers — but they're worth exploring together."}
        </p>
      </section>

      {/* ── Category Comparison Grid ────────────────────────── */}
      <section className="mb-14">
        <h2 className="text-[20px] font-semibold tracking-tight text-solid-text mb-6">
          Category Comparison
        </h2>

        <div className="space-y-3">
          <CategoryGridHeader partnerLabel={defaultPartnerLabel} />
          {alignment.categoryAlignments.map((ca) => (
            <CategoryComparisonRow key={ca.categoryId} alignment={ca} viewerIsInviter={isInviter} partnerLabel={defaultPartnerLabel} />
          ))}
        </div>
      </section>

      {/* ── Shared Strengths ────────────────────────────────── */}
      {hasSharedStrengths(alignment) && (
        <section className="mb-14">
          <h2 className="text-[20px] font-semibold tracking-tight text-solid-text mb-6">
            Shared Strengths
          </h2>
          <p className="text-[15px] text-solid-text-secondary mb-6">
            Questions where both of you scored 75 or higher — these are areas of
            natural alignment.
          </p>
          <SharedStrengthsList alignment={alignment} />
        </section>
      )}

      {/* ── Divergent Areas ─────────────────────────────────── */}
      {hasDivergentAreas(alignment) && (
        <section className="mb-14">
          <h2 className="text-[20px] font-semibold tracking-tight text-solid-text mb-6">
            Divergent Areas
          </h2>
          <p className="text-[15px] text-solid-text-secondary mb-6">
            Questions where your scores diverge by 40 points or more — these are
            worth discussing together.
          </p>
          <DivergentAreasList alignment={alignment} />
        </section>
      )}

      {report ? <EnhancedSections report={report} viewerIsInviter={isInviter} partnerLabelText={defaultPartnerLabel} /> : <div className="mb-10 rounded-xl border border-[#C4943A]/30 bg-[#C4943A]/[0.06] px-4 py-3 text-sm text-solid-text-secondary">Enhanced report not yet generated. Ask your partner to refresh.</div>}

      <div className="mb-10 flex justify-end">
        <RefreshReportButton pairingId={id} />
      </div>

      {/* ── Report ───────────────────────────────────────────── */}
      <div className="mb-10 flex justify-end">
        <ReportUserButton reportedUserId={reportedUserId} />
      </div>

      <section className="mb-10">
        <h2 className="mb-2 flex items-center gap-2 text-[20px] font-semibold tracking-tight text-solid-text"><MessageCircle size={20} /> {defaultPartnerLabel.charAt(0).toUpperCase() + defaultPartnerLabel.slice(1)} Chat</h2>
        <p className="mb-5 text-sm text-solid-text-secondary">Talk through your results together and turn insight into understanding.</p>
        <ChatPanelLazy pairingId={id} userName={currentUserName} mode={pairing.relationship_type} />
      </section>

      {/* ── Back ────────────────────────────────────────────── */}
      <div className="text-center pt-4">
        <Link href="/dashboard/pairings">
          <Button variant="ghost" size="md">
            ← Back to Pairings
          </Button>
        </Link>
      </div>
    </div>
  );
}

/* ── Category Grid Header ────────────────────────────────── */

function CategoryGridHeader({ partnerLabel: pLabel }: { partnerLabel: string }) {
  return (
    <div className="hidden md:grid grid-cols-[1fr_80px_auto_80px] gap-3 items-center px-2 pb-2 border-b border-solid-border">
      <span className="text-[12px] font-semibold text-solid-text-tertiary uppercase tracking-wider">
        Category
      </span>
      <span className="text-[12px] font-semibold text-solid-text-tertiary text-center uppercase tracking-wider">
        You
      </span>
      <span className="text-[12px] font-semibold text-solid-text-tertiary text-center uppercase tracking-wider">
        Alignment
      </span>
      <span className="text-[12px] font-semibold text-solid-text-tertiary text-center uppercase tracking-wider">
        {pLabel}
      </span>
    </div>
  );
}

/* ── Category Comparison Row ─────────────────────────────── */

function CategoryComparisonRow({
  alignment,
  viewerIsInviter,
  partnerLabel: pLabel,
}: {
  alignment: CategoryAlignment;
  viewerIsInviter: boolean;
  partnerLabel: string;
}) {
  const { categoryName, inviterScore, inviteeScore, alignment: alignScore } =
    alignment;
  const color = alignmentColor(alignScore);
  // Resolve scores relative to the signed-in viewer: "You" is always the
  // current user's score, "Partner" is the other person's.
  const youScore = viewerIsInviter ? inviterScore : inviteeScore;
  const partnerScore = viewerIsInviter ? inviteeScore : inviterScore;

  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-4 md:grid md:grid-cols-[1fr_80px_auto_80px] gap-3 items-center">
      {/* Category name */}
      <div className="mb-3 md:mb-0">
        <p className="text-[14px] font-semibold text-solid-text">
          {categoryName}
        </p>
      </div>

      {/* You score */}
      <div className="flex md:flex-col items-center gap-2 md:gap-1 mb-2 md:mb-0">
        <span className="text-[11px] text-solid-text-tertiary md:hidden">
          You:
        </span>
        <span className="text-[15px] font-semibold text-solid-text">
          {youScore}
        </span>
        <div className="flex-1 md:w-full h-1.5 rounded-full bg-solid-border overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(youScore, 100)}%`,
              backgroundColor: alignmentColor(youScore),
            }}
          />
        </div>
      </div>

      {/* Alignment middle */}
      <div className="flex items-center justify-center gap-2 mb-2 md:mb-0">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {alignScore}
        </div>
        <span className="text-[11px] md:hidden text-solid-text-tertiary">
          % aligned
        </span>
      </div>

      {/* Partner score */}
      <div className="flex md:flex-col items-center gap-2 md:gap-1">
        <span className="text-[11px] text-solid-text-tertiary md:hidden">
          {pLabel}:
        </span>
        <span className="text-[15px] font-semibold text-solid-text">
          {partnerScore}
        </span>
        <div className="flex-1 md:w-full h-1.5 rounded-full bg-solid-border overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(partnerScore, 100)}%`,
              backgroundColor: alignmentColor(partnerScore),
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Shared Strengths List ───────────────────────────────── */

function hasSharedStrengths(alignment: AlignmentResults): boolean {
  return alignment.categoryAlignments.some(
    (ca) => ca.sharedStrengths.length > 0,
  );
}

function SharedStrengthsList({
  alignment,
}: {
  alignment: AlignmentResults;
}) {
  const categories = alignment.categoryAlignments.filter(
    (ca) => ca.sharedStrengths.length > 0,
  );

  if (categories.length === 0) return null;

  return (
    <div className="space-y-6">
      {categories.map((ca) => (
        <div key={ca.categoryId}>
          <h3 className="text-[14px] font-semibold text-solid-text mb-3">
            {ca.categoryName}
          </h3>
          <div className="space-y-2">
            {ca.sharedStrengths.map((qId) => {
              const question = getQuestionById(qId);
              return (
                <div
                  key={qId}
                  className="bg-[#2E4A3A]/[0.06] border border-[#2E4A3A]/20 rounded-lg p-4 flex items-start gap-3"
                >
                  <span className="text-[#2E4A3A] shrink-0 mt-0.5">✓</span>
                  <p className="text-[14px] text-solid-text-secondary leading-relaxed">
                    {question?.text ?? `Question ${qId}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Divergent Areas List ────────────────────────────────── */

function hasDivergentAreas(alignment: AlignmentResults): boolean {
  return alignment.categoryAlignments.some(
    (ca) => ca.divergentAreas.length > 0,
  );
}

function DivergentAreasList({
  alignment,
}: {
  alignment: AlignmentResults;
}) {
  const categories = alignment.categoryAlignments.filter(
    (ca) => ca.divergentAreas.length > 0,
  );

  if (categories.length === 0) return null;

  return (
    <div className="space-y-6">
      {categories.map((ca) => (
        <div key={ca.categoryId}>
          <h3 className="text-[14px] font-semibold text-solid-text mb-3">
            {ca.categoryName}
          </h3>
          <div className="space-y-2">
            {ca.divergentAreas.map((qId) => {
              const question = getQuestionById(qId);
              return (
                <div
                  key={qId}
                  className="bg-[#C4943A]/[0.06] border border-[#C4943A]/20 rounded-lg p-4 flex items-start gap-3"
                >
                  <span className="text-[#C4943A] shrink-0 mt-0.5">↗</span>
                  <p className="text-[14px] text-solid-text-secondary leading-relaxed">
                    {question?.text ?? `Question ${qId}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EnhancedSections({ report, viewerIsInviter, partnerLabelText }: { report: ComparisonReport; viewerIsInviter: boolean; partnerLabelText: string }) {
  return <div className="space-y-10 mb-10">
    <ReportSection title="Potential Conflicts" icon={<Swords size={19} />} description="Differences are opportunities for honest, constructive conversation.">
      {report.potentialConflicts.length ? report.potentialConflicts.map((item) => <ConflictCard key={`${item.categoryId}-${item.type}`} item={item} />) : <EmptyReport text="No significant conflicts detected — your values align well." />}
    </ReportSection>
    <ReportSection title="Conversation Guides" icon={<MessageCircle size={19} />} description="Use these prompts to start meaningful conversations with your partner.">
      {report.conversationGuides.length ? report.conversationGuides.map((guide) => <article key={`${guide.categoryId}-${guide.topic}`} className="rounded-xl border border-solid-accent/15 bg-solid-accent/[0.05] p-5"><div className="flex items-start gap-3"><MessageCircle className="mt-0.5 shrink-0 text-solid-accent" size={18} /><div><p className="text-xs font-semibold uppercase tracking-wider text-solid-accent">{guide.categoryName}</p><h3 className="mt-1 font-semibold text-solid-text">{guide.topic}</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-solid-text-secondary">{guide.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ol></div></div></article>) : <EmptyReport text="No conversation guides available yet." />}
    </ReportSection>
    <ReportSection title="Growth Opportunities" icon={<Sprout size={19} />} description="See where you can grow together and learn from one another.">
      {report.growthOpportunities.length ? <div className="grid gap-4 md:grid-cols-2">{report.growthOpportunities.map((item) => <GrowthCard key={`${item.categoryId}-${item.type}`} item={item} viewerIsInviter={viewerIsInviter} partnerLabel={partnerLabelText} />)}</div> : <EmptyReport text="No major growth gaps — you're well-aligned across all categories." />}
    </ReportSection>
    <ReportSection title="Deal-Breaker Intersections" icon={<ShieldAlert size={19} />} description="Areas where a flagged boundary deserves careful attention.">
      {report.dealBreakerIntersections.length ? report.dealBreakerIntersections.map((item) => <article key={item.categoryId} className={`rounded-xl border p-5 ${item.bothTriggered ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start gap-3"><ShieldAlert className={item.bothTriggered ? "text-red-600" : "text-amber-600"} size={19} /><div><p className="text-xs font-semibold uppercase tracking-wider text-solid-text-tertiary">{item.categoryName}</p><h3 className="mt-1 font-semibold text-solid-text">{item.bothTriggered ? "Both partners flagged" : "One partner flagged"}</h3><p className="mt-1 text-sm text-solid-text-secondary">Discuss this boundary openly before moving forward.</p></div></div></article>) : <EmptyReport text="No deal-breakers detected in your compatibility profile." />}
    </ReportSection>
  </div>;
}

function ReportSection({ title, icon, description, children }: { title: string; icon: ReactNode; description: string; children: ReactNode }) {
  return <section><div className="mb-5"><h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight text-solid-text">{icon}{title}</h2><p className="mt-1 text-sm text-solid-text-secondary">{description}</p></div><div className="space-y-3">{children}</div></section>;
}
function EmptyReport({ text }: { text: string }) { return <div className="rounded-xl border border-solid-border bg-solid-surface p-6 text-center text-sm text-solid-text-secondary">{text}</div>; }
function ConflictCard({ item }: { item: ConflictItem }) { const tone = item.severity === "high" ? "red" : item.severity === "medium" ? "amber" : "slate"; return <article className={`rounded-xl border border-${tone}-200 bg-${tone}-50 p-5`}><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-solid-text">{item.categoryName}</span><span className={`rounded-full bg-${tone}-100 px-2.5 py-1 text-xs font-semibold uppercase text-${tone}-700`}>{item.severity}</span><span className="text-xs text-solid-text-tertiary">{item.type.replaceAll("_", " ")}</span></div><p className="mt-3 text-sm leading-relaxed text-solid-text-secondary">{item.description}</p></article>; }
function GrowthCard({ item, viewerIsInviter, partnerLabel: pLabel }: { item: GrowthOpportunity; viewerIsInviter: boolean; partnerLabel: string }) { const youScore = viewerIsInviter ? item.inviterScore : item.inviteeScore; const partnerScore = viewerIsInviter ? item.inviteeScore : item.inviterScore; return <article className="rounded-xl border border-solid-border bg-solid-surface p-5"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wider text-solid-text-tertiary">{item.categoryName}</p><span className="rounded-full bg-solid-bg px-2.5 py-1 text-xs font-medium text-solid-text-secondary">{item.type === "shared" ? "Shared growth" : "Complementary strength"}</span></div><p className="mt-3 text-sm leading-relaxed text-solid-text-secondary">{item.description}</p><div className="mt-4 flex gap-6 text-xs text-solid-text-tertiary"><span>You <strong className="text-solid-text">{youScore}</strong></span><span>{pLabel} <strong className="text-solid-text">{partnerScore}</strong></span></div></article>; }
