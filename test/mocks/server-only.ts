// ──────────────────────────────────────────────────────────────
// Stub for the `server-only` package in tests.
// The real package throws at import time outside a React Server
// Component (e.g. under vitest). This empty module lets modules
// that guard themselves with `import "server-only"` load in tests.
// ──────────────────────────────────────────────────────────────
export {};
