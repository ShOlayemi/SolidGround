"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — NPS Host (dashboard layout)
// Triggers the NPS survey on the 3rd dashboard visit. The survey is
// shown once per user (server-side eligibility + localStorage dismissal).
// Skipped on the results page, which shows the survey directly after
// assessment completion.
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// The survey itself is code-split: it is only ever rendered after the
// 3rd dashboard visit, so there is no reason to ship it in the initial bundle.
const NPSSurvey = dynamic(() => import("./NPSSurvey").then((m) => m.NPSSurvey), {
  ssr: false,
  loading: () => null,
});

const NPS_VISITS_KEY = "solidground.nps.visits";
const NPS_TRIGGER_VISITS = 3;
const NPS_DISMISS_KEY = "solidground.nps.dismissed";

interface NPSHostProps {
  userId: string;
  eligible: boolean;
}

export function NPSHost({ userId, eligible }: NPSHostProps) {
  const pathname = usePathname();
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    // The results page shows the survey inline after assessment completion.
    if (pathname.includes("/blueprint/results")) return;
    if (typeof window === "undefined") return;

    const visits = Number(window.localStorage.getItem(NPS_VISITS_KEY) ?? "0") + 1;
    window.localStorage.setItem(NPS_VISITS_KEY, String(visits));

    if (visits >= NPS_TRIGGER_VISITS) {
      const dismissed =
        window.localStorage.getItem(NPS_DISMISS_KEY) === "1";
      if (!dismissed) setTriggered(true);
    }
  }, [eligible, pathname]);

  if (!triggered) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick survey"
    >
      <div className="w-full max-w-[520px]">
        <NPSSurvey
          userId={userId}
          eligible={eligible}
          source="visit"
          onClose={() => setTriggered(false)}
          onSubmitted={() => {
            // Keep the thank-you visible briefly, then close the overlay.
            window.setTimeout(() => setTriggered(false), 3500);
          }}
        />
      </div>
    </div>
  );
}
