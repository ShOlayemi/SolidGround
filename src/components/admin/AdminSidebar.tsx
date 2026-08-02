"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { signOut } from "@/lib/auth/actions";
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  Shield,
  Menu,
  X,
  LogOut,
  MessageSquare,
} from "lucide-react";
import type { UserRole } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  admin: 'Administrator',
  moderator: 'Moderator',
  support: 'Support',
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/questions", label: "Questions", icon: MessageSquare },
  { href: "/admin/ai-prompts", label: "AI Prompts", icon: Sparkles },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/audit", label: "Audit Log", icon: Shield },
];

interface AdminSidebarProps {
  userEmail: string;
  userRole: string;
  /** Count of new (unreviewed) feedback, shown as a badge on Reports. */
  feedbackCount?: number;
}

export function AdminSidebar({ userEmail, userRole, feedbackCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);
  useEffect(() => { if (!mobileOpen) menuButtonRef.current?.focus(); }, [mobileOpen]);

  const initials = getInitials(userEmail.split("@")[0] || "Admin");

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        ref={menuButtonRef}
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        aria-label="Open admin menu"
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="primary-navigation"
        aria-label="Primary navigation"
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar-bg",
          "transition-[width] duration-200 ease-out",
          "w-56 md:w-16 lg:w-56",
          "-translate-x-full max-md:fixed",
          mobileOpen && "translate-x-0",
          "md:translate-x-0",
        )}
      >
        {/* Logo area — amber accent to distinguish admin */}
        <div className="h-14 flex items-center px-5 md:justify-center md:px-0 lg:justify-start lg:px-5 shrink-0">
          <div className="w-5 h-5 rounded-full bg-amber-500 shrink-0" />
          <span className="inline md:hidden lg:inline text-[18px] font-semibold tracking-tight text-text-inverse ml-2.5">
            SolidGround
          </span>
          <span className="inline md:hidden lg:inline ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            Admin
          </span>
        </div>

        <div className="border-t border-sidebar-border mx-4 mb-3" />

        {/* Nav items */}
        <nav aria-label="Main navigation" className="flex flex-col gap-0.5 px-2 flex-1 overflow-y-auto min-h-0">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 py-3.5 md:py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400",
                  "border-l-[3px]",
                  "md:justify-center md:px-0 md:mx-0",
                  "lg:justify-start lg:pl-[13px] lg:pr-4",
                  active
                    ? "bg-sidebar-active text-text-inverse border-amber-500"
                    : "text-sidebar-text-dim border-transparent hover:bg-sidebar-hover hover:text-text-inverse",
                )}
                onClick={() => setMobileOpen(false)}
              >
                <span className="relative shrink-0">
                  <Icon size={18} strokeWidth={1.5} />
                  {item.href === "/admin/reports" && feedbackCount > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1.5 h-2 w-2 rounded-full bg-amber-500"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="inline md:hidden lg:inline">{item.label}</span>
                {item.href === "/admin/reports" && feedbackCount > 0 && (
                  <span className="ml-auto inline rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white md:hidden lg:inline">
                    {feedbackCount > 99 ? "99+" : feedbackCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User row */}
        <div className="mt-auto pt-4 border-t border-sidebar-border px-4 pb-4">
          <div className="flex items-center gap-3 md:justify-center lg:justify-start">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-white">
                {initials}
              </span>
            </div>
            <div className="block md:hidden lg:block min-w-0">
              <p className="text-[13px] font-medium text-sidebar-text truncate">
                {userEmail.split("@")[0]}
              </p>
              <p className="text-[11px] text-amber-400 truncate">
                {ROLE_LABELS[userRole as UserRole] ?? userRole}
              </p>
            </div>
          </div>

          <form
            action={signOut}
            className="mt-3 md:flex md:justify-center lg:block"
          >
            <button
              type="submit"
              className="flex items-center gap-2 py-2 text-[13px] font-medium text-sidebar-text-dim hover:text-sidebar-text transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} strokeWidth={1.5} />
              <span className="inline md:hidden lg:inline">Sign out</span>
            </button>
          </form>
        </div>

        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          ref={closeButtonRef}
          className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded text-sidebar-text-dim hover:text-sidebar-text md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
          aria-label="Close menu"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </aside>
    </>
  );
}
