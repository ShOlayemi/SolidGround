// ──────────────────────────────────────────────────────────────
// SolidGround AI — Vitest Configuration
// ──────────────────────────────────────────────────────────────
import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // jsdom environment per Sprint 9.8 — enables DOM-based tests
    // for components/hooks later; pure logic tests run fine in it too.
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", ".run"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      // "server-only" throws when imported outside a React Server
      // Component. Route it to a stub in tests (admin auth module
      // imports it).
      "server-only": path.resolve(rootDir, "test/mocks/server-only.ts"),
    },
  },
});
