import config from "config";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  define: {
    buildTimeConfig: JSON.stringify(config.util.toObject()),
  },
  plugins: [sveltekit()],
  optimizeDeps: {
    include: [
      "@wooorm/starry-night",
      "@wooorm/starry-night/etc",
      "@wooorm/starry-night/go.mod",
      "@wooorm/starry-night/go.sum",
      "@wooorm/starry-night/source.batchfile",
      "@wooorm/starry-night/source.dockerfile",
      "@wooorm/starry-night/source.dotenv",
      "@wooorm/starry-night/source.editorconfig",
      "@wooorm/starry-night/source.erlang",
      "@wooorm/starry-night/source.git-revlist",
      "@wooorm/starry-night/source.gitattributes",
      "@wooorm/starry-night/source.gitconfig",
      "@wooorm/starry-night/source.gitignore",
      "@wooorm/starry-night/source.groovy.gradle",
      "@wooorm/starry-night/source.haproxy-config",
      "@wooorm/starry-night/source.ini.npmrc",
      "@wooorm/starry-night/source.json",
      "@wooorm/starry-night/source.nix",
      "@wooorm/starry-night/source.sass",
      "@wooorm/starry-night/source.solidity",
      "@wooorm/starry-night/source.svelte",
      "@wooorm/starry-night/source.toml",
      "@wooorm/starry-night/source.tsx",
      "@wooorm/starry-night/source.zig",
      "@wooorm/starry-night/text.html.asciidoc",
      "@wooorm/starry-night/text.html.django",
      "@wooorm/starry-night/text.html.vue",
      "@wooorm/starry-night/text.robots-txt",
      "@wooorm/starry-night/text.zone_file",
    ],
  },
  server: {
    host: "localhost",
    port: 3000,
    watch: {
      // reference: https://stackoverflow.com/a/75238360
      useFsEvents: false,
    },
  },
});
