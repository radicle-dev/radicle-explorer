/// <reference types="vitest" />
import path from 'path';
import { UserConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import rewriteAll from 'vite-plugin-rewrite-all';

const config: UserConfig = {
  optimizeDeps: {
    exclude: ['svelte-routing', '@pedrouid/environment', '@pedrouid/iso-crypto']
  },
  test: {
    deps: {
      inline: [
        "@ethersproject/signing-key",
        "@ethersproject/basex",
      ]
    },
    coverage: {
      reporter: ["text"],
      all: true,
      excludeNodeModules: true,
      extension: [".svelte", ".ts", ".js"]
    },
    environment: 'jsdom',
    setupFiles: [
      // Since Vitest runs on node, we need to polyfill fetch with node-fetch
      "src/polyfills/fetch.js",
      "src/polyfills/canvas.js"
    ]
  },
  plugins: [
    svelte({
      hot: !process.env.VITEST,
      compilerOptions: {
        dev: process.env.NODE_ENV !== "production"
      }
    }),
    rewriteAll(),
  ],
  resolve: {
    alias: {
      // This is needed for vite not to choke.
      "caip": path.resolve("./node_modules/caip/dist/umd/index.min.js"),
      '@app': path.resolve('./src'),
      '@test': path.resolve('./cypress'),
      // Polyfill for Node.js 'stream' library.
      'stream': path.resolve('./src/polyfills/stream.ts'),
      'typedarray-to-buffer': path.resolve('./src/polyfills/typedarray-to-buffer.js'),
      // "Buffer" is not defined in the published package..
      '@walletconnect/encoding': path.resolve('./src/polyfills/enc-utils.js'),
      'enc-utils': path.resolve('./src/polyfills/enc-utils.js'),
    },
  },
  define: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'process.env': { READABLE_STREAM: 'disable' }
  },
  build: {
    outDir: 'build',
    sourcemap: true
  }
};

// For Vitest to work we need to unset READABLE_STREAM.
if (process.env.VITEST) {
  config.define = undefined;
}

export default config;
