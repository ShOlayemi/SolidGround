type TestimonialCardProps = {
  quote: string;
  name: string;
  stage: string;
};

/**
 * TestimonialCard — style is final; copy is PLACEHOLDER.
 * // PLACEHOLDER — replace with verified customer quotes before launch.
 * // Do not publish fabricated testimonials.
 */
export function TestimonialCard({ quote, name, stage }: TestimonialCardProps) {
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <figure className="flex flex-col rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent-200 hover:shadow-[0_16px_40px_-16px_rgb(15_23_42_/_0.12)]">
      <blockquote className="flex-1 text-[17px] leading-[1.6] text-slate-600">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 text-[13px] font-semibold text-accent-700"
        >
          {initials}
        </span>
        <div>
          <p className="text-[14px] font-medium text-slate-900">{name}</p>
          <p className="text-[13px] text-slate-500">{stage}</p>
        </div>
      </figcaption>
    </figure>
  );
}
