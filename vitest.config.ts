/**
 * Vitest runs separately from `vite.config.ts` on purpose: the app config
 * pulls in TanStack Start, nitro and the Lovable plugins, none of which are
 * needed to execute unit tests. Only the `@` alias is replicated here.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(rootDir, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The app is checked by `tsc --noEmit`; tests only need to run.
    passWithNoTests: false,
    reporters: process.env["CI"] ? ["default"] : ["default"],
  },
});
