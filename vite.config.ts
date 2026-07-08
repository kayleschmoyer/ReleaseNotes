import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, forward API calls to the bundled server (npm run dev:server).
    // When it isn't running the app quietly falls back to demo mode.
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: {
    // No manualChunks: hand-splitting created chunk-load cycles that left
    // libraries with a null React at runtime (white-screen crash). MSAL is
    // split naturally via dynamic import; one main bundle is fine otherwise.
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
