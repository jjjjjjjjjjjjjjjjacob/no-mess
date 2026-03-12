import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "node_modules",
      ".next",
      "convex/_generated",
      "packages/no-mess-client",
      "packages/api-gateway",
    ],
  },
  resolve: {
    alias: [
      {
        find: "@no-mess/client/schema",
        replacement: path.resolve(
          __dirname,
          "./packages/no-mess-client/src/schema/index.ts",
        ),
      },
      {
        find: "@no-mess/client/react",
        replacement: path.resolve(
          __dirname,
          "./packages/no-mess-client/src/react/index.ts",
        ),
      },
      {
        find: "@no-mess/client",
        replacement: path.resolve(
          __dirname,
          "./packages/no-mess-client/src/index.ts",
        ),
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./"),
      },
    ],
  },
});
