#!/usr/bin/env bun
/** Validate environment variables required to build and run SolidGround AI. */

type Rule = { name: string; validate?: (value: string) => boolean; hint: string };

const required: Rule[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", validate: isUrl, hint: "a valid http(s) URL" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", validate: isJwt, hint: "a Supabase JWT" },
  { name: "NEXT_PUBLIC_POSTHOG_KEY", validate: (v) => v.startsWith("phc_"), hint: "a PostHog key starting with phc_" },
  { name: "OPENAI_API_KEY", validate: (v) => v.startsWith("sk-"), hint: "an OpenAI key starting with sk-" },
  { name: "RESEND_API_KEY", validate: (v) => v.startsWith("re_"), hint: "a Resend key starting with re_" },
  { name: "NEXT_PUBLIC_SITE_URL", validate: isUrl, hint: "a valid http(s) URL" },
];
const optional: Rule[] = [
  { name: "SENTRY_DSN", validate: isUrl, hint: "a valid URL" },
  { name: "STRIPE_SECRET_KEY", validate: (v) => v.startsWith("sk_"), hint: "a Stripe secret key starting with sk_" },
  { name: "STRIPE_PUBLISHABLE_KEY", validate: (v) => v.startsWith("pk_"), hint: "a Stripe publishable key starting with pk_" },
];
function isUrl(value: string): boolean { try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; } }
function isJwt(value: string): boolean { return value.split(".").length === 3 && value.startsWith("eyJ"); }

let failed = false;
for (const rule of required) {
  const value = process.env[rule.name]?.trim();
  if (!value) { console.error(`✗ Missing required variable: ${rule.name}`); failed = true; }
  else if (rule.validate && !rule.validate(value)) { console.error(`✗ Invalid ${rule.name}: expected ${rule.hint}`); failed = true; }
  else console.log(`✓ ${rule.name}`);
}
for (const rule of optional) {
  const value = process.env[rule.name]?.trim();
  if (!value) console.warn(`⚠ Optional variable not set: ${rule.name}`);
  else if (rule.validate && !rule.validate(value)) { console.error(`✗ Invalid optional ${rule.name}: expected ${rule.hint}`); failed = true; }
  else console.log(`✓ ${rule.name}`);
}
if (failed) { console.error("\nEnvironment validation failed."); process.exit(1); }
console.log("\nEnvironment validation passed.");
