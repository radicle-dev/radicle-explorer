import config from "config";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    buildTimeConfig: JSON.stringify(config.util.toObject()),
  },
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    reporters: "verbose",
  },
  resolve: {
    alias: {
      "@app": path.resolve("./src"),
      "@public": path.resolve("./public"),
      "@http-client": path.resolve("./http-client"),
      "@tests": path.resolve("./tests"),
    },
  },
});
