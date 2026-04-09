import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/trakt": {
        target: "https://api.trakt.tv",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/trakt/, ""),
        headers: {
          "Origin": "https://trakt.tv",
          "Referer": "https://trakt.tv/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor-other';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
