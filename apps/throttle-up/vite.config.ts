import { defineConfig } from "vite";

export default defineConfig({
  base: "/novadev-suite/apps/throttle-up/",
  root: ".",                 // IMPORTANT
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
