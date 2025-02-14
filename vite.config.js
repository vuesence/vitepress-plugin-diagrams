import { defineConfig } from "vite";
import { resolve } from "path";
// import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: resolve(__dirname, "./src/index.ts"),
      name: "vitepress-plugin-diagrams",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        'node:fs',
        'node:path',
        'node:crypto',
        'node:process',
        'node:stream',
        'node:util',
        'node:url',
        'node:fetch',
        'node:os',
        'node:assert',
        'node:events',
        'node:string_decoder',
        'node:buffer',
        'node:zlib',
        'node:http',
        'node:https',
        'node:net',
        'vitepress',
        'node:querystring',
        'node:punycode',
        'node:tty',
        'node:constants',
        'node:timers',
        'node:dns',
        'node:tls',
        'node:perf_hooks',
        'node:async_hooks',
        'node:diagnostics_channel',
        'node:querystring',
        'node:punycode',
        'node:tty',
        'node:constants',
        'node:timers',
        'node:dns',
        'node:tls',
        'node:perf_hooks',
        'node:async_hooks',
        'node:diagnostics_channel',
      ]
    },
  },
});
