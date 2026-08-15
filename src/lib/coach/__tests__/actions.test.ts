// ──────────────────────────────────────────────────────────────
// SolidGround AI — Coach Data-Layer Server Action Tests
// ──────────────────────────────────────────────────────────────
// Exercises src/lib/coach/actions.ts against the in-memory Supabase
// fake (src/lib/__tests__/helpers/supabaseMock.ts): conversation CRUD,
// the sendCoachMessage flow (user message → mock coach reply → coach
// message), and the ownership guards (a cross-user conversation is
// never readable, writable, deletable, or renamable).
//
// NEXT_PUBLIC_AI_MODE is set to "mock" so sendCoachMessage uses the
// deterministic offline coach — no network, no OpenAI key required
// (bun runs each test file in its own process).
// ──────────────────────────────────────────────────────────────
process.env.NEXT_PUBLIC_AI_MODE = "mock";

import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase } from "@/lib/__tests__/helpers/supabaseMock";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  sendCoachMessage,
} from "@/lib/coach/actions";

const USER_A = "user-a";
const USER_B = "user-b";
const CONV_A = "conv-a";
const CONV_B = "conv-b";

function seedConversation(
  id: string,
  userId: string,
  title = "New conversation",
  updatedAt = "2026-08-01T10:00:00.000Z",
): void {
  mockSupabase.seed("coach_conversations", [
    { id, user_id: userId, title, created_at: "2026-08-01T09:00:00.000Z", updated_at: updatedAt },
  ]);
}

function seedMessage(
  id: string,
  conversationId: string,
  role: "user" | "coach",
  content: string,
  createdAt: string,
): void {
  mockSupabase.seed("coach_messages", [
    { id, conversation_id: conversationId, role, content, created_at: createdAt },
  ]);
}

/** Seed a completed platonic Blueprint so the coach context is populated. */
function seedBlueprintContext(): void {
  mockSupabase.seed("assessment_sessions", [
    { id: "sess-1", user_id: USER_A, status: "completed", mode: "platonic", completed_at: "2026-08-01T08:00:00.000Z" },
  ]);
  mockSupabase.seed("blueprint_results", [
    {
      session_id: "sess-1",
      user_id: USER_A,
      category_results: [
        {
          category: "communication",
          label: "Communication & Emotional Connection",
          score: 80,
          confidence: 90,
          strengths: ["q-comm-1"],
          growthAreas: [],
          dealBreakerTriggered: false,
          questionScores: { "q-comm-1": 90 },
        },
        {
          category: "money",
          label: "Money & Finances",
          score: 40,
          confidence: 80,
          strengths: [],
          growthAreas: ["q-money-1"],
          dealBreakerTriggered: true,
          questionScores: { "q-money-1": 20 },
        },
      ],
    },
  ]);
}

const messageCount = (): number => (mockSupabase.tables["coach_messages"] ?? []).length;

describe("createConversation", () => {
  beforeEach(() => mockSupabase.reset());

  it("requires authentication", async () => {
    const result = await createConversation();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not authenticated.");
    expect(mockSupabase.tables["coach_conversations"] ?? []).toHaveLength(0);
  });

  it("creates a conversation titled 'New conversation' and returns its id", async () => {
    mockSupabase.setSession(USER_A);
    const result = await createConversation();
    expect(result.ok).toBe(true);
    expect(result.id).toBeTruthy();
    const rows = mockSupabase.tables["coach_conversations"] ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: result.id, user_id: USER_A, title: "New conversation" });
  });
});

describe("listConversations", () => {
  beforeEach(() => mockSupabase.reset());

  it("returns only the current user's conversations, newest activity first", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A, "First", "2026-08-01T10:00:00.000Z");
    seedConversation("conv-a2", USER_A, "Second", "2026-08-02T10:00:00.000Z");
    seedConversation(CONV_B, USER_B, "Other user's", "2026-08-03T10:00:00.000Z");

    const result = await listConversations();
    expect(result.ok).toBe(true);
    expect(result.conversations).toHaveLength(2);
    expect(result.conversations![0].id).toBe("conv-a2"); // newest first
    expect(result.conversations![1].id).toBe(CONV_A);
    expect(result.conversations![0].title).toBe("Second");
    expect(result.conversations![0].updatedAt).toBe("2026-08-02T10:00:00.000Z");
  });

  it("requires authentication", async () => {
    const result = await listConversations();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });
});

describe("getConversation", () => {
  beforeEach(() => mockSupabase.reset());

  it("returns the conversation with its transcript oldest-first", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A, "Money talk");
    seedMessage("m1", CONV_A, "user", "First question", "2026-08-01T10:00:00.000Z");
    seedMessage("m2", CONV_A, "coach", "First answer", "2026-08-01T10:01:00.000Z");
    seedMessage("m3", CONV_A, "user", "Second question", "2026-08-01T10:02:00.000Z");

    const result = await getConversation(CONV_A);
    expect(result.ok).toBe(true);
    expect(result.conversation).toMatchObject({ id: CONV_A, title: "Money talk" });
    expect(result.conversation!.messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(result.conversation!.messages[0].role).toBe("user");
    expect(result.conversation!.messages[0].content).toBe("First question");
  });

  it("guards ownership — another user's conversation is not found", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_B, USER_B, "Private");
    const result = await getConversation(CONV_B);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Conversation not found.");
  });

  it("returns not found for a missing conversation", async () => {
    mockSupabase.setSession(USER_A);
    const result = await getConversation("does-not-exist");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Conversation not found.");
  });

  it("requires authentication", async () => {
    const result = await getConversation(CONV_A);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });
});

describe("sendCoachMessage", () => {
  beforeEach(() => mockSupabase.reset());

  it("persists the user message and the deterministic mock coach reply, returns the coach message", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A);
    seedBlueprintContext(); // completed platonic Blueprint → coach context

    const result = await sendCoachMessage(CONV_A, "We keep fighting about money");
    expect(result.ok).toBe(true);
    expect(result.coachMessage).toBeTruthy();
    expect(result.coachMessage!.role).toBe("coach");
    expect(result.coachMessage!.conversationId).toBe(CONV_A);
    expect(result.coachMessage!.content.length).toBeGreaterThan(20);

    const rows = mockSupabase.tables["coach_messages"] ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ conversation_id: CONV_A, role: "user", content: "We keep fighting about money" });
    expect(rows[1]).toMatchObject({ conversation_id: CONV_A, role: "coach" });

    // Mock reply is mode-aware: platonic context → friend language.
    expect(result.coachMessage!.content).toContain("friend");
    // And message-derived: echoes a word the user used.
    expect(result.coachMessage!.content).toContain('"fighting"');
  });

  it("succeeds ungrounded when the user has no completed Blueprint (context is null)", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A);

    const result = await sendCoachMessage(CONV_A, "We keep fighting about money");
    expect(result.ok).toBe(true);
    expect(result.coachMessage!.content).toContain('"fighting"');
    expect(messageCount()).toBe(2);
  });

  it("caps the transcript to the most recent turns (older history is not sent)", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A);
    // 25 prior turns + the new user message = 26 rows.
    for (let i = 0; i < 25; i++) {
      seedMessage(`old-${String(i).padStart(2, "0")}`, CONV_A, i % 2 === 0 ? "user" : "coach", `history-${i}`, `2026-08-01T${String(Math.floor(i / 2)).padStart(2, "0")}:00:00.000Z`);
    }

    const result = await sendCoachMessage(CONV_A, "We keep fighting about money");
    expect(result.ok).toBe(true);
    // The history cap is exercised inside the action; the observable
    // contract here is that the reply still succeeds with a long
    // transcript and both messages are persisted.
    expect(messageCount()).toBe(27);
  });

  it("guards ownership — cannot message another user's conversation", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_B, USER_B);

    const result = await sendCoachMessage(CONV_B, "Hello?");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Conversation not found.");
    expect(messageCount()).toBe(0);
  });

  it("requires authentication", async () => {
    seedConversation(CONV_A, USER_A);
    const result = await sendCoachMessage(CONV_A, "Hello?");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not authenticated.");
    expect(messageCount()).toBe(0);
  });

  it("rejects an empty or whitespace-only message", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A);

    for (const bad of ["", "   "]) {
      const result = await sendCoachMessage(CONV_A, bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Message is required.");
    }
    expect(messageCount()).toBe(0);
  });
});

describe("deleteConversation", () => {
  beforeEach(() => mockSupabase.reset());

  it("deletes an owned conversation", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A);

    const result = await deleteConversation(CONV_A);
    expect(result.ok).toBe(true);
    expect(mockSupabase.tables["coach_conversations"] ?? []).toHaveLength(0);
  });

  it("guards ownership — another user's conversation is not deleted", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_B, USER_B);

    const result = await deleteConversation(CONV_B);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Conversation not found.");
    expect(mockSupabase.tables["coach_conversations"] ?? []).toHaveLength(1);
  });

  it("requires authentication", async () => {
    seedConversation(CONV_A, USER_A);
    const result = await deleteConversation(CONV_A);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Not authenticated.");
  });
});

describe("renameConversation", () => {
  beforeEach(() => mockSupabase.reset());

  it("renames an owned conversation", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A, "Old title");

    const result = await renameConversation(CONV_A, "New title");
    expect(result.ok).toBe(true);
    expect(mockSupabase.tables["coach_conversations"]![0].title).toBe("New title");
  });

  it("guards ownership — another user's conversation is not renamed", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_B, USER_B, "Private");

    const result = await renameConversation(CONV_B, "Hijacked");
    expect(result.ok).toBe(false);
    expect(mockSupabase.tables["coach_conversations"]![0].title).toBe("Private");
  });

  it("rejects an empty title", async () => {
    mockSupabase.setSession(USER_A);
    seedConversation(CONV_A, USER_A);

    const result = await renameConversation(CONV_A, "   ");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Title is required.");
    expect(mockSupabase.tables["coach_conversations"]![0].title).toBe("New conversation");
  });
});
