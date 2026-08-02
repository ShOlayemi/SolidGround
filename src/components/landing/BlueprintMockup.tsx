/**
 * BlueprintMockup — static product visual for the hero.
 * Decorative (aria-hidden): the ring score, bar values, and deal-breaker
 * chip are visual placeholders, not real product data. Real scores live
 * in the product. Slow float animation (CSS, reduced-motion-safe).
 */

const BARS = [
  { label: "Communication", value: "74%", width: "74%" },
  { label: "Core Values", value: "88%", width: "88%" },
  { label: "Finances", value: "61%", width: "61%" },
];

// Circumference of r=50 ring is 2π·50 ≈ 314.16; 82% arc ≈ 257.6
const ARC_LENGTH = 257.6;
const RING_CIRCUMFERENCE = 314.16;

export function BlueprintMockup() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[360px] sm:max-w-[400px]">
      {/* Ambient indigo glow behind the card */}
      <div className="absolute -inset-6 -z-10 rounded-full bg-accent-500/10 blur-2xl" />

      <div className="animate-float rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xl sm:p-8">
        <p className="mb-6 text-[12px] font-medium uppercase tracking-[0.14em] text-slate-400">
          Overall Compatibility
        </p>

        {/* ScoreRing */}
        <div className="mb-8 flex justify-center">
          <svg viewBox="0 0 120 120" className="h-24 w-full max-w-28 sm:h-28">
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#4F46E5"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${ARC_LENGTH} ${RING_CIRCUMFERENCE}`}
              transform="rotate(-90 60 60)"
            />
            <text
              x="60"
              y="60"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-900 text-[28px] font-semibold tabular-nums"
            >
              82
            </text>
          </svg>
        </div>

        {/* CategoryBars */}
        <div className="space-y-4">
          {BARS.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-slate-600">
                  {bar.label}
                </span>
                <span className="text-[13px] tabular-nums text-slate-400">
                  {bar.value}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-accent-600"
                  style={{ width: bar.width }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Deal-breaker chip */}
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3.5 py-1.5 text-[13px] font-medium text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
          1 deal breaker to discuss
        </div>
      </div>
    </div>
  );
}
