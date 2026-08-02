import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-solid-bg px-5 py-12">
      {/* Logo */}
      <a href="/" className="mb-10 inline-block">
        <span className="text-[22px] font-semibold tracking-tight text-solid-text">
          SolidGround
        </span>
      </a>

      {/* Centered card */}
      <div className="w-full max-w-[420px] bg-solid-surface border border-solid-border rounded-xl p-8 shadow-sm">
        {children}
      </div>

      {/* Footer text */}
      <p className="mt-8 text-[13px] text-solid-text-tertiary text-center">
        &copy; {new Date().getFullYear()} SolidGround AI. All rights reserved.
      </p>
    </div>
  );
}
