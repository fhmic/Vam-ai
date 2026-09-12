#!/usr/bin/env node
// scripts/db-types.mjs
// Runs `supabase gen types typescript` against the linked project if one
// is configured, otherwise falls back to the local Supabase stack.
//
// `supabase gen types --linked` fails noisily when no project is linked,
// which made `npm run db:types` unusable on fresh checkouts and in CI
// before `supabase start`. We probe for the project-ref file that
// `supabase link` writes, then dispatch to the right subcommand.
//
// Both subcommands regenerate the same `src/types/database.ts` so the
// rest of the codebase does not need to know which one ran.

import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { platform } from "node:process";

const projectRefPath = "supabase/.temp/project-ref";
const useLinked = existsSync(projectRefPath);
const subcommand = useLinked ? "linked" : "local";

console.log(`[db:types] project-ref file: ${existsSync(projectRefPath) ? "found" : "not found"}`);
console.log(`[db:types] using --${subcommand} project`);

const npx = platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(npx, ["supabase", "gen", "types", "typescript", `--${subcommand}`], {
  stdio: ["ignore", "pipe", "inherit"],
  shell: platform === "win32",
});

let stdout = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
});

child.on("exit", (code) => {
  if (code !== 0) {
    console.error(`[db:types] supabase CLI exited with code ${code}`);
    process.exit(code ?? 1);
  }
  writeFileSync("src/types/database.ts", stdout);
  console.log(`[db:types] wrote ${stdout.length} bytes to src/types/database.ts`);
});

child.on("error", (err) => {
  console.error("[db:types] failed to spawn supabase CLI:", err.message);
  process.exit(1);
});
