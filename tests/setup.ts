/**
 * Global Vitest setup. Runs before every test file.
 *
 * Loads .env.test if present (see tests/README.md) so integration tests
 * can pick up TEST_SUPABASE_URL / TEST_SUPABASE_SERVICE_ROLE_KEY without
 * every test file re-implementing dotenv loading. Safe to run even when
 * that file doesn't exist — integration tests independently skip
 * themselves when the env vars are absent (see
 * tests/integration/env.ts).
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";

/**
 * `server-only` throws unconditionally when imported outside a webpack
 * build with its special resolve condition set — which is exactly what
 * makes it a useful build-time guard in the real Next.js app (verified
 * separately via `npm run build`). Vitest runs in plain Node, not
 * webpack, so every test that imports a module guarded by `server-only`
 * (auth-guard.ts, admin.ts, lib/legal/acceptance.ts, etc.) would fail
 * for a reason that has nothing to do with the logic under test. This
 * mock only affects the Vitest runtime; it does not weaken the real
 * build-time protection against an accidental client-bundle import.
 */
vi.mock("server-only", () => ({}));

const envTestPath = path.resolve(__dirname, "../.env.test");
if (existsSync(envTestPath)) {
  config({ path: envTestPath });
}
