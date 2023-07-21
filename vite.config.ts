import type { Connect, ViteDevServer } from "vite";
import type http from "node:http";

import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.ts"],
    reporters: "verbose",
  },
  plugins: [
    svelte({
      compilerOptions: { dev: process.env.NODE_ENV !== "production" },
    }),
    configureDevServer(),
    configurePreviewServer(),
  ],
  server: {
    host: "localhost",
    port: 3000,
  },
  resolve: {
    alias: {
      "@app": path.resolve("./src"),
      "@public": path.resolve("./public"),
      "@httpd-client": path.resolve("./httpd-client"),
      "@tests": path.resolve("./tests"),
    },
  },
  build: {
    outDir: "build",
    rollupOptions: {
      output: {
        manualChunks: {
          markdown: [
            "@radicle/gray-matter",
            "dompurify",
            "hast-util-to-dom",
            "hast-util-to-html",
            "katex",
            "marked",
          ],
          dom: ["svelte", "twemoji"],
        },
      },
    },
  },

  define: {
    VITEST: process.env.VITEST !== undefined,
    PLAYWRIGHT: process.env.PLAYWRIGHT_TEST_BASE_URL !== undefined,
  },
});

function configureDevServer() {
  return {
    name: "configure-dev-server",
    configureServer(server: ViteDevServer) {
      return () => {
        server.middlewares.use((req, _res, next) => {
          req.url = "/index.html";
          next();
        });
      };
    },
  };
}

function configurePreviewServer() {
  return {
    name: "configure-preview-server",
    configurePreviewServer(server: {
      middlewares: Connect.Server;
      httpServer: http.Server;
    }) {
      server.middlewares.use((req, _res, next) => {
        if (
          fs.existsSync(`./public${req.url}`) ||
          req.url?.startsWith("/assets")
        ) {
          return next();
        }
        req.url = "/index.html";
        next();
      });
    },
  };
}
