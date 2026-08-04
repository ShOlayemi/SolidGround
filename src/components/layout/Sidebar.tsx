"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { signOut } from "@/lib/auth/actions";
import {
  LayoutDashboard,
  FileText,
  Target,
  BarChart3,
  Sparkles,
  FileSpreadsheet,
  MessageSquarePlus,
  Users,
  UserPlus,
  Settings,
  Bell,
  CreditCard,
  Menu,
  X,
  LogOut,
} from "lucide-react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/blueprint", label: "Blueprint", icon: FileText },
  { href: "/dashboard/scores", label: "Scores", icon: Target },
  { href: "/dashboard/charts", label: "Charts", icon: BarChart3 },
  { href: "/dashboard/blueprint/results", label: "AI Insights", icon: Sparkles },
  { href: "/dashboard/reports", label: "Reports", icon: FileSpreadsheet },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquarePlus },
  { href: "/dashboard/discover", label: "Discover", icon: Users },
  { href: "/dashboard/requests", label: "Requests", icon: UserPlus },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  userEmail: string;
  userName: string;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
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

  const initials = getInitials(userName || "User");

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        ref={menuButtonRef}
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-20 flex h-11 w-11 items-center justify-center rounded-lg bg-white border border-gray-200 shadow-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        aria-label="Open menu"
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>

      {/* Mobile overlay backdrop */}
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
          "w-60 md:w-16 lg:w-60",
          // Mobile: off-screen by default, slide in when open
          "-translate-x-full max-md:fixed",
          mobileOpen && "translate-x-0",
          "md:translate-x-0",
        )}
      >
        {/* Logo area */}
        <div className="h-14 flex items-center px-5 md:justify-center md:px-0 lg:justify-start lg:px-5 shrink-0">
          {/* Brand dot */}
          <div className="w-5 h-5 rounded-full bg-accent-500 shrink-0" />
          <span className="inline md:hidden lg:inline text-[18px] font-semibold tracking-tight text-text-inverse ml-2.5">
            SolidGround
          </span>
        </div>

        {/* Divider */}
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
                    ? "bg-sidebar-active text-text-inverse border-accent-500"
                    : "text-sidebar-text-dim border-transparent hover:bg-sidebar-hover hover:text-text-inverse",
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                <span className="inline md:hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User row */}
        <div className="mt-auto pt-4 border-t border-sidebar-border px-4 pb-4">
          <div className="flex items-center gap-3 md:justify-center lg:justify-start">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold text-white">
                {initials}
              </span>
            </div>
            <div className="block md:hidden lg:block min-w-0">
              <p className="text-[13px] font-medium text-sidebar-text truncate">
                {userName}
              </p>
              <p className="text-[11px] text-sidebar-text-dim truncate">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Sign out */}
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

        {/* Mobile close button */}
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
