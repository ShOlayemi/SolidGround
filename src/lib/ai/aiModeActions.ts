"use server";
// ──────────────────────────────────────────────────────────────
// SolidGround AI — Dev AI Mode Server Actions
// ──────────────────────────────────────────────────────────────
// Server-only endpoints for the dev Settings panel. These run with
// full access to server env (incl. OPENAI_API_KEY) but NEVER return
// the key value to the client — only a presence boolean (see
// getAIModeStatus) and a valid/invalid verdict from the key check.
// Dev-only: callers render null outside development builds; the
// key-check action also refuses to run outside development.
// ──────────────────────────────────────────────────────────────
import { getAIModeStatus, type AIEffectiveModeStatus } from "./aiModeStatus";

/** Server-side effective mode + key presence (never the key). */
export async function getDevAIModeStatus(): Promise<AIEffectiveModeStatus> {
  return getAIModeStatus();
}

export type VerifyKeyResult =
  | { status: "disabled" }
  | { status: "no-key" }
  | { status: "valid" }
  | { status: "invalid" }
  | { status: "error"; message: string };

/**
 * Dev-only "Verify key" check: pings OpenAI's free GET /v1/models
 * endpoint with the server key and reports valid/invalid. No tokens
 * are consumed and the key value never leaves the server.
 */
export async function verifyOpenAIKey(): Promise<VerifyKeyResult> {
  if (process.env.NODE_ENV !== "development") {
    return { status: "disabled" };
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { status: "no-key" };
  }
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Request failed",
    };
  }
  return res.ok ? { status: "valid" } : { status: "invalid" };
}
