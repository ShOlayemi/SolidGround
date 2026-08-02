import Link from "next/link";
import type { BlueprintStatus, Profile } from "@/types";

interface NextStepCardProps {
  profile: Profile | null;
  blueprintStatus: BlueprintStatus;
  sessionId: string | null;
}

function getNextStep(
  profile: Profile | null,
  blueprintStatus: BlueprintStatus,
  sessionId: string | null,
): { title: string; description: string; href: string } {
  if (!profile) {
    return {
      title: "Complete your profile",
      description:
        "Set up your profile so we can tailor your Compatibility Blueprint to you.",
      href: "/dashboard/profile",
    };
  }

  if (blueprintStatus === "not_started") {
    return {
      title: "Start your Compatibility Blueprint",
      description:
        "Take the structured assessment across five key dimensions of relationship compatibility.",
      href: "/dashboard/blueprint",
    };
  }

  if (blueprintStatus === "in_progress") {
    const href = sessionId
      ? `/dashboard/blueprint/assess?sessionId=${sessionId}`
      : "/dashboard/blueprint";
    return {
      title: "Continue your assessment",
      description:
        "Pick up where you left off and complete the remaining dimensions of your Blueprint.",
      href,
    };
  }

  // Complete — link to results
  const href = sessionId
    ? `/dashboard/blueprint/results?sessionId=${sessionId}`
    : "/dashboard/blueprint";
  return {
    title: "Invite your partner to compare",
    description:
      "Share your results and discover how your compatibility profiles align.",
    href,
  };
}

export function NextStepCard({
  profile,
  blueprintStatus,
  sessionId,
}: NextStepCardProps) {
  const step = getNextStep(profile, blueprintStatus, sessionId);

  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
      <h3 className="text-[18px] font-semibold text-solid-text mb-3">
        Recommended Next Step
      </h3>
      <p className="text-[15px] text-solid-text-secondary mb-5 leading-relaxed">
        {step.description}
      </p>
      <Link
        href={step.href}
        className="inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus:outline-none px-6 py-3.5 text-[14px] leading-[1.4] bg-solid-accent text-white hover:bg-solid-accent-hover focus:ring-2 focus:ring-solid-accent/20"
      >
        {step.title}
      </Link>
    </div>
  );
}
