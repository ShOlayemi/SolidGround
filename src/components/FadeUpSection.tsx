"use client";

import { useEffect, useRef, type ReactNode } from "react";

type FadeUpSectionProps = {
  children: ReactNode;
  className?: string;
  /** Optional stagger delay in ms (applied via inline transition-delay). */
  delay?: number;
};

export function FadeUpSection({ children, className, delay }: FadeUpSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honor prefers-reduced-motion: reveal immediately, no rise.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.style.opacity = "1";
            target.style.transform = "translateY(0)";
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: "opacity 600ms ease-out, transform 600ms ease-out",
        transitionDelay: delay !== undefined ? `${delay}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
