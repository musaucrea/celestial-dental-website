import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  build: {
    modulePreload: {
      polyfill: false,
    },
  },
  // Local preview only: proxy /api to production so pages that fetch
  // CMS content (blog, gallery, branches) render with real data.
  preview: {
    proxy: {
      '/api': {
        target: 'https://celestialdental.org',
        changeOrigin: true,
      },
    },
  },
});
