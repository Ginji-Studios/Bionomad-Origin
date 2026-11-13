import { defineConfig } from "vite";

// base "./": i percorsi della build sono relativi, così il gioco funziona
// in qualsiasi sottocartella (GitHub Pages: /Bionomad-Origin/) e su qualsiasi hosting
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    // Phaser arriva dalla CDN: lo lasciamo esterno
    rollupOptions: { external: [/^https:\/\//] }
  }
});
