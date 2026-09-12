import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * CTO Review Foundation Hardening — Change #7: Foundation Testing.
 *
 * Vitest was already a devDependency (package.json) but had no config
 * and no tests — this is the first real config for it. `@/*` alias
 * mirrors tsconfig.json's `paths` mapping; Vitest doesn't read tsconfig
 * paths on its own without an extra plugin, so it's declared explicitly
 * here instead of adding a new dependency for one alias.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": path.resolve(__dirname, "./tests/mocks/next-server.ts"),
      "next/image": path.resolve(__dirname, "./tests/mocks/next-image.tsx"),
    },
  },
});
