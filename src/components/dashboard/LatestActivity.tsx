import type { AuditEntry } from "@/types";

interface LatestActivityProps {
  entries: AuditEntry[];
}

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay} days ago`;
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDay / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    "profile.update": "Profile updated",
    "profile.avatar_update": "Avatar updated",
    "profile.created": "Profile created",
    "account.verified": "Account verified",
    "blueprint.started": "Blueprint started",
    "blueprint.completed": "Blueprint completed",
  };
  return labels[action] ?? action.replace(".", " — ");
}

const placeholders: { action: string; created_at: string }[] = [
  { action: "profile.created", created_at: new Date().toISOString() },
  { action: "account.verified", created_at: new Date(Date.now() - 60000).toISOString() },
];

export function LatestActivity({ entries }: LatestActivityProps) {
  const hasEntries = entries.length > 0;
  const displayItems = hasEntries ? entries : placeholders;

  return (
    <div className="bg-solid-surface border border-solid-border rounded-xl p-8">
      <h3 className="text-[18px] font-semibold text-solid-text mb-4">
        Latest Activity
      </h3>

      {!hasEntries && (
        <p className="text-[14px] text-solid-text-tertiary mb-5">
          No activity yet. Complete your profile to get started.
        </p>
      )}

      <ul className="divide-y divide-solid-border">
        {displayItems.map((entry, i) => (
          <li
            key={entry.action + i}
            className="py-3.5 first:pt-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[15px] text-solid-text">
                {actionLabel(entry.action)}
              </span>
              <span className="text-[13px] text-solid-text-tertiary shrink-0">
                {relativeTime(entry.created_at)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
