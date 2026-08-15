"use client";

// ──────────────────────────────────────────────────────────────
// SolidGround AI — Private reflection editor (create + edit)
// ──────────────────────────────────────────────────────────────
// Inline form card rendered by ReflectionsClient. Create mode takes the
// note content (required, capped at 2000 chars) plus an OPTIONAL link to one
// of the pairing's conversation topics (the topic's category is derived
// automatically) or to an area (category) on its own. Edit mode only changes
// content — UpdateReflectionInput exposes content only (the link columns are
// immutable after creation, mirroring the mobile service).
//
// Owner-only semantics: user_id always comes from the session via the server
// action; RLS enforces auth.uid() = user_id. Content is NEVER sent to the
// partner or any coach provider.
// ──────────────────────────────────────────────────────────────

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createReflection, updateReflection } from "@/lib/journey/actions";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/assessment/questions";
import type { JourneyTopic, PrivateReflection } from "@/lib/journey/types";

/** Reflection length cap — must match the server action (2000). */
const REFLECTION_MAX_LENGTH = 2000;

const inputClass =
  "w-full rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20";
const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";

export function ReflectionForm({
  pairingId,
  topics,
  reflection,
  onSaved,
  onCancel,
}: {
  pairingId: string;
  /** The pairing's journey topics — the optional "linked topic" choices. */
  topics: JourneyTopic[];
  /** When provided the form edits this reflection (content only); otherwise it creates one. */
  reflection: PrivateReflection | null;
  onSaved: (saved: PrivateReflection) => void;
  onCancel: () => void;
}) {
  const editing = reflection !== null;

  const [content, setContent] = useState(reflection?.content ?? "");
  const [topicId, setTopicId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const overLimit = content.length > REFLECTION_MAX_LENGTH;

  async function save() {
    if (saving) return;

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setContentError("Write something before saving your reflection.");
      return;
    }
    if (trimmed.length > REFLECTION_MAX_LENGTH) {
      setContentError(`Reflections are limited to ${REFLECTION_MAX_LENGTH} characters.`);
      return;
    }
    setContentError(null);
    setSaveError(null);
    setSaving(true);

    try {
      const result = editing && reflection
        ? await updateReflection(reflection.id, { content: trimmed })
        : await createReflection({
            pairingId,
            topicId: topicId.length > 0 ? topicId : null,
            categoryId: resolvedCategoryId(),
            content: trimmed,
          });
      if (!result.ok) {
        setSaveError(result.error ?? "Failed to save your reflection. Please try again.");
        return;
      }
      onSaved(result.data);
    } catch {
      setSaveError("Failed to save your reflection. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /** The category to persist: the linked topic's category wins when a topic
   * is chosen; otherwise the explicitly selected area (or null). */
  function resolvedCategoryId(): string | null {
    const chosenTopic = topicId.length > 0 ? topics.find((t) => t.id === topicId) : undefined;
    if (chosenTopic) return chosenTopic.categoryId;
    return categoryId.length > 0 ? categoryId : null;
  }

  const chosenTopic = topicId.length > 0 ? topics.find((t) => t.id === topicId) : undefined;
  const categorySelectValue = chosenTopic ? chosenTopic.categoryId : categoryId;

  return (
    <div className="rounded-xl border border-card-border bg-card-bg p-5">
      <h2 className="text-sm font-semibold text-text-primary">
        {editing ? "Edit reflection" : "New private reflection"}
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        Notes for you — only you can see them, never your partner, never the coach.
      </p>

      {saveError ? (
        <div role="alert" className="mt-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
          {saveError}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="reflection-content" className={labelClass}>
            Your notes <span className="text-danger-500">*</span>
          </label>
          <textarea
            id="reflection-content"
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (contentError) setContentError(null);
            }}
            placeholder="What's on your mind as you talk this through?"
            rows={6}
            className={`${inputClass} resize-y`}
            aria-invalid={contentError !== null}
          />
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            {contentError ? (
              <p className="text-xs text-danger-600">{contentError}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs tabular-nums ${overLimit ? "font-semibold text-danger-600" : "text-text-tertiary"}`}
            >
              {content.length}/{REFLECTION_MAX_LENGTH}
            </span>
          </div>
        </div>

        {!editing ? (
          <>
            <div>
              <label htmlFor="reflection-topic" className={labelClass}>
                Link to a conversation topic (optional)
              </label>
              <select
                id="reflection-topic"
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
                className={inputClass}
              >
                <option value="">No topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.categoryName} — {topic.topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reflection-category" className={labelClass}>
                …or link to an area (optional)
              </label>
              <select
                id="reflection-category"
                value={categorySelectValue}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setTopicId("");
                }}
                disabled={chosenTopic !== undefined}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <option value="">No area</option>
                {CATEGORY_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {CATEGORY_LABELS[id]}
                  </option>
                ))}
              </select>
              {chosenTopic ? (
                <p className="mt-1.5 text-xs text-text-tertiary">
                  Linked to {chosenTopic.categoryName} — area follows the topic.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {editing ? "Save changes" : "Save reflection"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
