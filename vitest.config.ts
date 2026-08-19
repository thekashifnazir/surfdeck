import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".wrangler"],
  },
});
