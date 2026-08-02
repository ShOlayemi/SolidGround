"use client";

import { useEffect, useState } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { getNotifications, markAllAsRead, markAsRead, type Notification } from "@/lib/notifications/actions";

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const load = async () => { const result = await getNotifications(userId); if (result.success) { setItems(result.notifications); setUnread(result.unreadCount); } };
  useEffect(() => { void load(); }, [userId]);
  const read = async (notification: Notification) => { if (!notification.read) { await markAsRead(notification.id); setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item)); setUnread((count) => Math.max(0, count - 1)); } if (typeof notification.data?.href === "string") window.location.href = notification.data.href; };
  return <div className="relative">
    <button type="button" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} onClick={() => setOpen((value) => !value)} className="relative flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-card-hover hover:text-text-primary"><Bell size={20} strokeWidth={1.7} />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}</button>
    {open && <div className="absolute right-0 z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-card-border bg-card-bg shadow-xl"><div className="flex items-center justify-between border-b border-card-border px-4 py-3"><h2 className="text-sm font-semibold text-text-primary">Notifications</h2><button type="button" onClick={async () => { await markAllAsRead(userId); setItems((current) => current.map((item) => ({ ...item, read: true }))); setUnread(0); }} className="text-xs font-medium text-accent-600 hover:text-accent-700">Mark all read</button></div><div className="max-h-96 overflow-y-auto">{items.length === 0 ? <p className="px-4 py-10 text-center text-sm text-text-tertiary">No notifications</p> : items.map((notification) => <button type="button" key={notification.id} onClick={() => void read(notification)} className={`flex w-full gap-3 border-b border-card-border px-4 py-3 text-left transition hover:bg-card-hover ${notification.read ? "opacity-70" : "bg-accent-50/40"}`}><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-slate-300" : "bg-red-500"}`} /><span className="min-w-0 flex-1"><span className="flex items-center gap-1 text-sm font-medium text-text-primary">{notification.title}{typeof notification.data?.href === "string" && <ExternalLink size={12} />}</span><span className="mt-0.5 block text-xs text-text-secondary">{notification.message}</span><time className="mt-1 block text-[10px] text-text-tertiary">{new Date(notification.created_at).toLocaleDateString()}</time></span>{notification.read && <Check size={14} className="mt-1 text-accent-600" />}</button>)}</div></div>}
  </div>;
}
