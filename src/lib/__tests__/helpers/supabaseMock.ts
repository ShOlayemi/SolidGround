// ──────────────────────────────────────────────────────────────
// SolidGround AI — In-Memory Supabase Mock for Integration Tests
// ──────────────────────────────────────────────────────────────
// A chainable, in-memory fake of the Supabase client surface used
// by the server actions under test. It implements just enough of
// the postgrest-js query API (select / eq / neq / in / or / order /
// range / limit / insert / update / upsert / single / maybeSingle /
// count) to exercise the real orchestration + validation logic in
// src/lib/*/actions.ts against a seeded in-memory database.
//
// The singleton is wired to `@/lib/supabase/server` via vi.mock in
// this module, so every module that calls `createClient()` (including
// cross-module calls like pairings → notifications) shares one store.
// ──────────────────────────────────────────────────────────────
import { vi } from "vitest";

type Row = Record<string, unknown>;

type Filter =
  | { op: "eq"; col: string; value: unknown }
  | { op: "neq"; col: string; value: unknown }
  | { op: "in"; col: string; value: unknown[] }
  | { op: "or"; raw: string };

interface QueryState {
  table: string;
  columns?: string;
  countOptions?: { count?: "exact"; head?: boolean };
  filters: Filter[];
  order?: { col: string; ascending: boolean };
  range?: [number, number];
  limit?: number;
  action?: "insert" | "update" | "upsert";
  payload?: Row | Row[];
  onConflict?: string;
}

type QueryResult = {
  data: Row | Row[] | null;
  error: { message: string } | null;
  count?: number | null;
};

/** Parse a supabase `or` clause like "inviter_user_id.eq.x,invitee_user_id.eq.y". */
function orMatches(row: Row, raw: string): boolean {
  return raw.split(",").some((part) => {
    const [col, op, ...rest] = part.split(".");
    const value = rest.join(".");
    if (op === "eq") return row[col] === value;
    return false;
  });
}

function matches(row: Row, filter: Filter): boolean {
  switch (filter.op) {
    case "eq":
      return row[filter.col] === filter.value;
    case "neq":
      return row[filter.col] !== filter.value;
    case "in":
      return (filter.value as unknown[]).includes(row[filter.col]);
    case "or":
      return orMatches(row, filter.raw);
  }
}

function project(row: Row, columns?: string): Row {
  if (!columns || columns.trim() === "*") return { ...row };
  const keys = columns.split(",").map((c) => c.trim()).filter(Boolean);
  const out: Row = {};
  for (const key of keys) {
    if (key in row) out[key] = row[key];
  }
  return out;
}

function newId(): string {
  return `mock_${Math.random().toString(36).slice(2, 12)}`;
}

/** Column defaults applied on INSERT, mirroring DB schema defaults. */
const INSERT_DEFAULTS: Record<string, Row> = {
  notifications: { read: false },
  feedback: { status: "new" },
  pairings: { status: "pending" },
};

class QueryBuilder {
  constructor(
    private store: MockSupabase,
    private state: QueryState,
  ) {}

  select(
    columns: string | { count?: "exact"; head?: boolean },
    options?: { count?: "exact"; head?: boolean },
  ): this {
    if (typeof columns === "object") {
      // supabase also allows select("id", { count: "exact" }) — treat
      // an object as the options argument when passed as the first arg.
      this.state.columns = undefined;
      this.state.countOptions = columns;
    } else {
      this.state.columns = columns;
      this.state.countOptions = options;
    }
    return this;
  }
  eq(col: string, value: unknown): this {
    this.state.filters.push({ op: "eq", col, value });
    return this;
  }
  neq(col: string, value: unknown): this {
    this.state.filters.push({ op: "neq", col, value });
    return this;
  }
  in(col: string, values: unknown[]): this {
    this.state.filters.push({ op: "in", col, value: values });
    return this;
  }
  or(raw: string): this {
    this.state.filters.push({ op: "or", raw });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }): this {
    this.state.order = { col, ascending: opts?.ascending ?? true };
    return this;
  }
  range(from: number, to: number): this {
    this.state.range = [from, to];
    return this;
  }
  limit(n: number): this {
    this.state.limit = n;
    return this;
  }
  insert(payload: Row | Row[]): this {
    this.state.action = "insert";
    this.state.payload = payload;
    return this;
  }
  update(payload: Row): this {
    this.state.action = "update";
    this.state.payload = payload;
    return this;
  }
  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.state.action = "upsert";
    this.state.payload = payload;
    this.state.onConflict = opts?.onConflict;
    return this;
  }
  single(): Promise<QueryResult> {
    return this.execute({ single: "hard" });
  }
  maybeSingle(): Promise<QueryResult> {
    return this.execute({ single: "maybe" });
  }
  /** Make the builder awaitable at any point in the chain. */
  then<T = QueryResult>(
    onFulfilled?: (value: QueryResult) => T | PromiseLike<T>,
    onRejected?: (reason: unknown) => T | PromiseLike<T>,
  ): Promise<T> {
    return this.execute({}).then(onFulfilled, onRejected);
  }
  catch<T = never>(
    onRejected?: (reason: unknown) => T | PromiseLike<T>,
  ): Promise<QueryResult | T> {
    return this.execute({}).catch(onRejected);
  }
  finally(onFinally?: () => void): Promise<QueryResult> {
    return this.execute({}).finally(onFinally);
  }

  private matchedRows(): Row[] {
    const table = this.store.tables[this.state.table] ?? [];
    let rows = table.filter((row) =>
      this.state.filters.every((f) => matches(row, f)),
    );
    if (this.state.order) {
      const { col, ascending } = this.state.order;
      rows = [...rows].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === bv) return 0;
        if (av === undefined || av === null) return 1;
        if (bv === undefined || bv === null) return -1;
        const cmp = (av as string | number) < (bv as string | number) ? -1 : 1;
        return ascending ? cmp : -cmp;
      });
    }
    if (this.state.limit !== undefined) {
      rows = rows.slice(0, this.state.limit);
    }
    if (this.state.range) {
      const [from, to] = this.state.range;
      rows = rows.slice(from, to + 1);
    }
    return rows;
  }

  private execute(opts: { single?: "hard" | "maybe" }): Promise<QueryResult> {
    const s = this.state;

    // Simulated per-table failure (test control).
    if (this.store.failures.has(s.table)) {
      return Promise.resolve({
        data: null,
        error: { message: this.store.failures.get(s.table)! },
        count: null,
      });
    }

    const table = this.store.tables[s.table] ?? (this.store.tables[s.table] = []);

    // ── Mutations ──────────────────────────────────────────
    if (s.action === "insert") {
      const rows = (Array.isArray(s.payload) ? s.payload : [s.payload!]).map(
        (r) => {
          const defaults = INSERT_DEFAULTS[s.table] ?? {};
          const merged = { ...defaults, ...r };
          if (!merged.id) merged.id = newId();
          if (!merged.created_at) merged.created_at = new Date().toISOString();
          return merged;
        },
      );
      table.push(...rows);
      const data = rows.length === 1 ? rows[0] : rows;
      return Promise.resolve({ data, error: null, count: null });
    }

    if (s.action === "update") {
      const targets = this.matchedRows();
      for (const t of targets) {
        Object.assign(t, s.payload);
      }
      return Promise.resolve({ data: null, error: null, count: null });
    }

    if (s.action === "upsert") {
      const rows = Array.isArray(s.payload) ? s.payload : [s.payload!];
      const conflictKey = s.onConflict;
      for (const row of rows) {
        const existing = conflictKey
          ? table.find((r) => r[conflictKey] === row[conflictKey])
          : undefined;
        if (existing) {
          Object.assign(existing, row);
        } else {
          if (!row.id) row.id = newId();
          table.push(row);
        }
      }
      return Promise.resolve({ data: null, error: null, count: null });
    }

    // ── Reads ──────────────────────────────────────────────
    let rows = this.matchedRows();

    const countRequested = s.countOptions?.count === "exact";
    const count = countRequested ? rows.length : null;

    if (countRequested && s.countOptions?.head) {
      return Promise.resolve({ data: [], error: null, count });
    }

    const projected = rows.map((r) => project(r, s.columns));

    if (opts.single === "hard") {
      if (projected.length === 0) {
        return Promise.resolve({ data: null, error: { message: "Not found" }, count });
      }
      return Promise.resolve({ data: projected[0], error: null, count });
    }
    if (opts.single === "maybe") {
      return Promise.resolve({
        data: projected[0] ?? null,
        error: null,
        count,
      });
    }
    return Promise.resolve({ data: projected, error: null, count });
  }
}

export class MockSupabase {
  /** In-memory tables: table name → rows. */
  tables: Record<string, Row[]> = {};
  /** Auth session returned by auth.getSession() / auth.getUser(). */
  session: { user: { id: string; email?: string } } | null = null;
  /** Recorded RPC calls (e.g. create_notification_for_user). */
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  /** Per-table forced errors: table name → error message. */
  failures = new Map<string, string>();

  reset(): this {
    this.tables = {};
    this.session = null;
    this.rpcCalls = [];
    this.failures.clear();
    return this;
  }

  seed(table: string, rows: Row[]): this {
    this.tables[table] = [...(this.tables[table] ?? []), ...rows];
    return this;
  }

  setSession(userId: string, email = "user@example.com"): this {
    this.session = { user: { id: userId, email } };
    return this;
  }

  clearSession(): this {
    this.session = null;
    return this;
  }

  failTable(table: string, message: string): this {
    this.failures.set(table, message);
    return this;
  }

  get client(): {
    auth: {
      getSession: () => Promise<{ data: { session: { user: { id: string; email?: string } } | null }; error: null }>;
      getUser: () => Promise<{ data: { user: { id: string; email?: string } | null }; error: { message: string } | null }>;
    };
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string; error: null }>;
    from: (table: string) => QueryBuilder;
  } {
    return {
      auth: {
        getSession: async () => ({ data: { session: this.session }, error: null }),
        getUser: async () => ({
          data: { user: this.session?.user ?? null },
          error: this.session ? null : { message: "Not authenticated" },
        }),
      },
      rpc: async (fn: string, args: Record<string, unknown>) => {
        this.rpcCalls.push({ fn, args });
        return { data: `rpc_${fn}`, error: null };
      },
      from: (table: string) => new QueryBuilder(this, { table, filters: [] }),
    };
  }
}

// ── Singleton + module interception ────────────────────────────
// Every module that imports createClient() from @/lib/supabase/server
// (including cross-module calls like pairings → notifications) gets
// this same in-memory client.
export const mockSupabase = new MockSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockSupabase.client,
  createServiceClient: async () => mockSupabase.client,
}));

vi.mock("@/lib/email/send", () => ({
  sendWelcomeEmail: vi.fn(async () => {}),
  sendVerificationEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPartnerInviteEmail: vi.fn(async () => {}),
  sendAssessmentCompleteEmail: vi.fn(async () => {}),
  sendSubscriptionConfirmEmail: vi.fn(async () => {}),
  sendBillingReceiptEmail: vi.fn(async () => {}),
  sendCancellationConfirmEmail: vi.fn(async () => {}),
}));
