"use client";

import { useState } from "react";
import { RotateCw } from "lucide-react";
import { refreshReport } from "@/lib/pairings/actions";

export function RefreshReportButton({ pairingId }: { pairingId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    const result = await refreshReport(pairingId);
    if (result.success) {
      setDone(true);
      // Reload the page to show fresh data
      window.location.reload();
    } else {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
        <RotateCw size={13} className="animate-spin" />
        Refreshing…
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-solid-text-tertiary hover:text-solid-accent transition-colors disabled:opacity-50"
    >
      <RotateCw size={13} className={loading ? "animate-spin" : ""} />
      {loading ? "Refreshing…" : "Refresh Report"}
    </button>
  );
}
