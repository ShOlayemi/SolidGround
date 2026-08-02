#!/usr/bin/env bun
/** Apply SQL migrations in lexical filename order using Supabase's Postgres connection. */
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL (or SUPABASE_DB_URL). Use Supabase's direct Postgres connection string.");
  process.exit(1);
}
const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  await client.query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const file of files) {
    const result = await client.query<{ name: string }>("SELECT name FROM _migrations WHERE name = $1", [file]);
    if (result.rowCount) { console.log(`SKIP ${file}`); continue; }
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`APPLY ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`FAILED ${file}:`, error instanceof Error ? error.message : error);
      process.exitCode = 1;
      break;
    }
  }
} finally { await client.end().catch(() => undefined); }
