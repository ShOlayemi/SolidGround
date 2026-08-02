"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 0);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      aria-label="Main"
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 flex h-16 items-center bg-white/80 backdrop-blur-md transition-colors duration-200",
        scrolled && "border-b border-slate-200",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 md:px-8">
        <Link
          href="/"
          className="rounded-md text-[18px] font-semibold tracking-tight text-slate-900 transition-colors hover:text-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          SolidGround
        </Link>
        <div className="flex items-center gap-2 sm:gap-5">
          <a
            href="/login"
            className="hidden rounded-md px-3 py-2 text-[14px] font-medium text-slate-600 transition-colors hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 sm:inline-flex"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            <Button variant="filled" size="sm" className="px-4 py-2">
              Start free
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
