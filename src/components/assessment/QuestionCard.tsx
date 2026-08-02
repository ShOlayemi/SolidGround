"use client";

import type { AssessmentQuestion } from "@/types";
import { CATEGORY_LABELS } from "@/lib/assessment/questions";

interface QuestionCardProps {
  question: AssessmentQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  questionNumber: number;
  totalInCategory: number;
}

export function QuestionCard({
  question,
  value,
  onChange,
  error,
  questionNumber,
  totalInCategory,
}: QuestionCardProps) {
  const inputId = (name: string) => `q_${question.id}_${name}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Category label */}
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-solid-text-tertiary">
        {CATEGORY_LABELS[question.category]}
      </span>

      {/* Question text */}
      <h2 className="text-[22px] leading-[1.35] font-semibold tracking-tight text-solid-text">
        {question.text}
      </h2>

      {/* Question number */}
      <p className="text-[13px] text-solid-text-secondary -mt-2">
        Question {questionNumber} of {totalInCategory}
      </p>

      {/* Input area */}
      <div className="mt-3">
        {question.type === "likert_5" && (
          <LikertInput
            question={question}
            value={value}
            onChange={onChange}
            inputId={inputId}
          />
        )}
        {question.type === "single_choice" && (
          <SingleChoiceInput
            question={question}
            value={value}
            onChange={onChange}
            inputId={inputId}
          />
        )}
        {question.type === "text" && (
          <TextInput
            question={question}
            value={value}
            onChange={onChange}
            inputId={inputId}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-solid-error mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Likert 5-point scale ─────────────────────────────────── */

const LIKERT_LABELS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

function LikertInput({
  question,
  value,
  onChange,
  inputId,
}: {
  question: AssessmentQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  inputId: (name: string) => string;
}) {
  const selected = typeof value === "number" ? value : null;

  return (
    <fieldset>
      <legend className="sr-only">{question.text}</legend>
      <div className="flex flex-col gap-2">
        {LIKERT_LABELS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={inputId(String(opt.value))}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer
                transition-all duration-200 select-none focus-within:ring-2 focus-within:ring-accent-400 focus-within:ring-offset-2
                ${
                  isSelected
                    ? "border-solid-accent bg-solid-accent-subtle text-solid-text"
                    : "border-solid-border bg-solid-surface text-solid-text-secondary hover:border-solid-accent/40 hover:bg-solid-accent-subtle/50"
                }
              `}
            >
              <span
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                  transition-colors duration-200
                  ${
                    isSelected
                      ? "border-solid-accent"
                      : "border-solid-border"
                  }
                `}
              >
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-solid-accent" />
                )}
              </span>
              <span className="text-[14px] font-medium">{opt.label}</span>
              <input
                type="radio"
                id={inputId(String(opt.value))}
                name={inputId("likert")}
                value={opt.value}
                checked={isSelected ?? false}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Single choice ────────────────────────────────────────── */

function SingleChoiceInput({
  question,
  value,
  onChange,
  inputId,
}: {
  question: AssessmentQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  inputId: (name: string) => string;
}) {
  const selected = typeof value === "string" ? value : null;
  const options = question.options ?? [];

  return (
    <fieldset>
      <legend className="sr-only">{question.text}</legend>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={inputId(opt.value)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer
                transition-all duration-200 select-none focus-within:ring-2 focus-within:ring-accent-400 focus-within:ring-offset-2
                ${
                  isSelected
                    ? "border-solid-accent bg-solid-accent-subtle text-solid-text"
                    : "border-solid-border bg-solid-surface text-solid-text-secondary hover:border-solid-accent/40 hover:bg-solid-accent-subtle/50"
                }
              `}
            >
              <span
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                  transition-colors duration-200
                  ${
                    isSelected
                      ? "border-solid-accent"
                      : "border-solid-border"
                  }
                `}
              >
                {isSelected && (
                  <span className="w-2.5 h-2.5 rounded-full bg-solid-accent" />
                )}
              </span>
              <span className="text-[14px] font-medium">{opt.label}</span>
              <input
                type="radio"
                id={inputId(opt.value)}
                name={inputId("single")}
                value={opt.value}
                checked={isSelected ?? false}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Text input (future-proofed) ──────────────────────────── */

function TextInput({
  question,
  value,
  onChange,
  inputId,
}: {
  question: AssessmentQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  inputId: (name: string) => string;
}) {
  return (
    <div>
      <label htmlFor={inputId("text")} className="sr-only">
        {question.text}
      </label>
      <textarea
        id={inputId("text")}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Type your answer..."
        className="w-full rounded-xl border border-solid-border bg-solid-surface px-4 py-3 text-[15px] text-solid-text placeholder:text-solid-text-tertiary focus:outline-none focus:ring-2 focus:ring-solid-accent/20 focus:border-solid-accent transition-colors duration-200 resize-y"
      />
      <p className="text-[12px] text-solid-text-tertiary mt-1.5">
        {(typeof value === "string" ? value.length : 0)} / 2000 characters
      </p>
    </div>
  );
}
