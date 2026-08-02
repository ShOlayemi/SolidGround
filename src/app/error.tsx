"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/monitoring/sentry";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { captureError(error); }, [error]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-indigo-600">SolidGround AI</p>
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-slate-600">We couldn&apos;t load this page. Please try again.</p>
        <button onClick={reset} className="mt-7 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">Try again</button>
      </div>
    </main>
  );
}
