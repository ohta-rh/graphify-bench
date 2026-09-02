import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["bench/**/*.test.ts", "scripts/**/*.test.ts"],
    exclude: ["node_modules/**", "corpus/**", "results/**", "bench/fixtures/**"],
    environment: "node",
  },
});
