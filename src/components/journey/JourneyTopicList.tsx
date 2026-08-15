import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { JourneyTopic } from "@/lib/journey/types";
import { groupTopicsByStatus } from "@/lib/journey/display";
import { TopicStatusPill } from "./TopicStatusPill";

/**
 * SolidGround AI — Journey conversation topic list.
 *
 * Topics grouped by status (Not started / Discussed), each row showing the
 * category eyebrow + the report's topic verbatim + a status pill. Clicking a
 * topic opens /dashboard/journey/topics/[topicId]. Report order is preserved
 * within each group. Rendered server-side — navigation re-renders it with
 * fresh statuses.
 */
export function JourneyTopicList({ topics }: { topics: JourneyTopic[] }) {
  const { notStarted, discussed } = groupTopicsByStatus(topics);

  return (
    <section aria-label="Conversation topics">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-text-primary">Conversation topics</h2>
        <span className="text-xs tabular-nums text-text-tertiary">{topics.length} total</span>
      </div>
      <p className="mt-1 text-sm text-text-secondary">
        Drawn from your Alignment Match™ — pick one and start talking.
      </p>

      {topics.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center text-sm text-text-secondary">
          No conversation topics yet — your Alignment Match™ will surface them as your comparison
          report finds areas worth exploring.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          <TopicGroup title="Not started" topics={notStarted} />
          <TopicGroup title="Discussed" topics={discussed} />
        </div>
      )}
    </section>
  );
}

function TopicGroup({ title, topics }: { title: string; topics: JourneyTopic[] }) {
  if (topics.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
        <span className="ml-1.5 tabular-nums normal-case">{topics.length}</span>
      </h3>
      <ul className="space-y-2.5">
        {topics.map((topic) => (
          <li key={topic.id}>
            <Link
              href={`/dashboard/journey/topics/${topic.id}`}
              className="group flex items-center gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3.5 transition hover:border-accent-300 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent-700">
                  {topic.categoryName}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-text-primary group-hover:text-text-primary">
                  {topic.topic}
                </p>
              </div>
              <TopicStatusPill status={topic.status} />
              <ChevronRight
                size={16}
                strokeWidth={1.5}
                className="shrink-0 text-text-tertiary transition group-hover:text-text-primary"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
