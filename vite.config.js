import { defineConfig } from "vite";
import { resolve } from "path";
// import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [],
  build: {
    lib: {
      entry: resolve(__dirname, "./index.ts"),
      name: "vitepress-plugin-diagrams",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        'node:fs',
        'node:path',
        'node:crypto',
      ]
    },
  },
});
