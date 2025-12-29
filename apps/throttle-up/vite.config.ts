import { defineConfig } from "vite";

export default defineConfig({
  base: "/novadev-suite/",
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
