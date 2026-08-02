import type { ReactNode } from "react";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { ShieldCheckIcon, LockIcon, TrashIcon, HandHeartIcon } from "@/components/icons";

type TrustItem = {
  icon: ReactNode;
  label: string;
  href?: string;
};

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: <ShieldCheckIcon size={20} />,
    label: "Encrypted at rest and in transit",
  },
  {
    icon: <LockIcon size={20} />,
    label: "Never sold. Never shared.",
  },
  {
    icon: <TrashIcon size={20} />,
    label: "Delete your data anytime",
    href: "/privacy/delete",
  },
  {
    icon: <HandHeartIcon size={20} />,
    label: "AI advises, you decide",
  },
];

/**
 * TrustStrip — privacy & agency signals. Full-width slate-50 strip,
 * 2×2 on mobile, 4 columns on lg.
 */
export function TrustStrip() {
  return (
    <Section id="trust" className="py-20 md:py-24 bg-slate-50">
      <Container>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => {
            const content = (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent-600 shadow-sm ring-1 ring-slate-200">
                  {item.icon}
                </span>
                <h3 className="mt-3 text-[14px] font-medium leading-[1.5] text-slate-700">
                  {item.label}
                </h3>
              </>
            );
            const classes =
              "flex flex-col items-center text-center rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500";
            return item.href ? (
              <a key={item.label} href={item.href} className={classes}>
                {content}
              </a>
            ) : (
              <div key={item.label} className={classes}>
                {content}
              </div>
            );
          })}
        </div>
        <p className="mt-10 text-center text-[13px] text-slate-500">
          Built to GDPR standards.{" "}
          <a
            href="/privacy"
            className="font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 transition-colors hover:text-accent-600 hover:decoration-accent-300"
          >
            See our Privacy Policy
          </a>
          .
        </p>
      </Container>
    </Section>
  );
}
