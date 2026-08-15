"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { signOut } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/Avatar";
import {
  LayoutDashboard,
  FileText,
  Target,
  BarChart3,
  Sparkles,
  MessagesSquare,
  Route,
  FileSpreadsheet,
  MessageSquarePlus,
  MessageCircle,
  Users,
  UserPlus,
  User,
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
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/blueprint", label: "Blueprint", icon: FileText },
  { href: "/dashboard/scores", label: "Scores", icon: Target },
  { href: "/dashboard/charts", label: "Charts", icon: BarChart3 },
  { href: "/dashboard/ai-insights", label: "AI Insights", icon: Sparkles },
  { href: "/dashboard/coach", label: "AI Coach", icon: MessagesSquare },
  { href: "/dashboard/journey", label: "Journey", icon: Route },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
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
  avatarUrl?: string | null;
  pendingRequestCount?: number;
}

export function Sidebar({ userEmail, userName, avatarUrl, pendingRequestCount = 0 }: SidebarProps) {
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
          "w-60",
          // Mobile: off-screen by default, slide in when open
          "-translate-x-full max-md:fixed",
          mobileOpen && "translate-x-0",
          "md:translate-x-0",
        )}
      >
        {/* Logo area */}
        <div className="h-14 flex items-center justify-start px-5 shrink-0">
          {/* Brand dot */}
          <div className="w-5 h-5 rounded-full bg-accent-500 shrink-0" />
          <span className="inline text-[18px] font-semibold tracking-tight text-text-inverse ml-2.5">
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
                  "flex items-center gap-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400",
                  "border-l-[3px] justify-start pl-[13px] pr-4",
                  active
                    ? "bg-sidebar-active text-text-inverse border-accent-500"
                    : "text-sidebar-text-dim border-transparent hover:bg-sidebar-hover hover:text-text-inverse",
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                <span className="inline">{item.label}</span>
                {item.href === "/dashboard/requests" && pendingRequestCount > 0 && (
                  <span
                    className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white"
                    aria-label={`${pendingRequestCount} pending incoming request${pendingRequestCount === 1 ? "" : "s"}`}
                  >
                    {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User row */}
        <div className="mt-auto pt-4 border-t border-sidebar-border px-4 pb-4">
          <div className="flex items-center gap-3 justify-start">
            {/* Avatar */}
            <Avatar src={avatarUrl} alt={userName} size="sm" initials={initials} />
            <div className="block min-w-0">
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
            className="mt-3 block"
          >
            <button
              type="submit"
              className="flex items-center gap-2 py-2 text-[13px] font-medium text-sidebar-text-dim hover:text-sidebar-text transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} strokeWidth={1.5} />
              <span className="inline">Sign out</span>
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
