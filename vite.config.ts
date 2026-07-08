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
    rollupOptions: {
      output: {
        manualChunks: {
          msal: ['@azure/msal-browser', '@azure/msal-react'],
          markdown: ['react-markdown', 'remark-gfm'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
