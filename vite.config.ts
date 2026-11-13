import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base: the build works under any GitHub Pages sub-path
// (https://<user>.github.io/color-metal-architectural-atlas/). Routing is hash based.
export default defineConfig({
  base: './',
  plugins: [react()],
  // work/ holds research, caches and QA output — never part of the app (and busy files there must not crash the watcher)
  server: { port: 5174, watch: { ignored: ['**/work/**', '**/dist/**'] } },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
