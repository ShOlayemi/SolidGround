"use client";
import { useState } from "react";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";
import { discoverUsers, sendConnectionRequest, type DiscoverUser } from "@/lib/connections/actions";

function initials(user: DiscoverUser): string { return (user.display_name || user.full_name).trim().charAt(0).toUpperCase(); }
function bioSnippet(bio: string | null): string { if (!bio) return "Has completed a Compatibility Blueprint and is ready for a more intentional connection."; return bio.length > 100 ? `${bio.slice(0, 100).trimEnd()}…` : bio; }

export function DiscoverClient({ initialUsers }: { initialUsers: DiscoverUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function search(value: string) { setQ(value); const r = await discoverUsers(value); if (r.success) setUsers(r.users); }
  async function connect(id: string) { setBusy(id); setError(null); const r = await sendConnectionRequest(id); if (r.success) setUsers((v) => v.map((u) => u.id === id ? { ...u, hasPending: true } : u)); else setError(r.error ?? "Could not send request."); setBusy(null); }
  return <div className="max-w-[960px] mx-auto py-8 md:py-10">
    <div className="mb-8"><p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-600">Find your people</p><h1 className="mt-2 text-[28px] font-semibold tracking-tight text-solid-text">Discover</h1><p className="mt-2 text-[15px] text-solid-text-secondary">Connect with people who are intentional about building lasting relationships.</p></div>
    <div className="relative mb-6"><Search className="absolute left-4 top-3.5 text-solid-text-tertiary" size={18}/><input value={q} onChange={(e) => void search(e.target.value)} placeholder="Search by name" className="w-full rounded-xl border border-solid-border bg-solid-surface py-3 pl-11 pr-4 text-[14px] outline-none focus:border-accent-400" aria-label="Search users"/></div>
    {error && <p className="mb-4 text-sm text-red-600" role="alert">{error}</p>}
    {users.length === 0 ? <div className="rounded-2xl border border-solid-border bg-solid-surface p-12 text-center text-solid-text-secondary">No completed Blueprints found yet. Check back soon.</div> : <div className="grid gap-4 sm:grid-cols-2">{users.map((u) => <article key={u.id} className="rounded-2xl border border-solid-border bg-solid-surface p-5"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-accent-100 text-center text-lg font-semibold leading-[3rem] text-accent-700">{u.avatar_url ? <img src={u.avatar_url} alt={`${u.display_name}'s profile`} className="h-full w-full object-cover" /> : initials(u)}</div><div><h2 className="font-semibold text-solid-text">{u.display_name}{u.age ? <span className="ml-2 font-normal text-solid-text-secondary">{u.age}</span> : null}</h2><div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-solid-text-secondary">{u.gender && <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">{u.gender}</span>}{u.relationship_status && <span>{u.relationship_status}</span>}</div></div></div><span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">Blueprint complete</span></div><p className="mt-4 min-h-10 text-[13px] leading-relaxed text-solid-text-secondary">{bioSnippet(u.bio)}</p>{u.incomingPending ? <div className="mt-4 flex items-center gap-2 text-[13px] font-medium text-accent-700"><UserPlus size={16}/> Wants to connect with you</div> : <button disabled={u.hasPending || busy === u.id} onClick={() => void connect(u.id)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-60">{busy === u.id ? <Loader2 size={15} className="animate-spin"/> : u.hasPending ? <Check size={15}/> : <UserPlus size={15}/>} {u.hasPending ? "Requested" : "Connect"}</button>}</article>)}</div>}
  </div>;
}
