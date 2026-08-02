"use client";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — NPS Host (lazy)
// Client-only wrapper that code-splits NPSHost (and, transitively,
// the NPS survey) out of the initial dashboard bundle. NPSHost
// renders nothing until the 3rd dashboard visit, so the loading
// fallback is intentionally invisible — there is nothing to paint.
// ──────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";

const NPSHost = dynamic(
  () => import("./NPSHost").then((m) => m.NPSHost),
  {
    ssr: false,
    loading: () => null,
  },
);

export function NPSHostLazy({
  userId,
  eligible,
}: {
  userId: string;
  eligible: boolean;
}) {
  return <NPSHost userId={userId} eligible={eligible} />;
}
