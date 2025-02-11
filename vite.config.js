import { defineConfig } from "vite";
import { resolve } from "path";
// import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: resolve(__dirname, "./index.ts"),
      name: "JsonMarkdown",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        'node:fs',
        'node:path',
        'node:events',
        'node:stream',
        'node:string_decoder',
        'glob',
        'json5',
        'marked'
      ]
    },
  },
});
