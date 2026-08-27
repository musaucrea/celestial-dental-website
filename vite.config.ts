import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import homeSchemas from './public/home-schema.json';

/**
 * Put the homepage's canonical JSON-LD in the initial HTML response.
 *
 * The SPA used to add schema only after React mounted, so non-JavaScript
 * clients saw none. The crawler-only PHP renderer had a separate copy, which
 * made drift inevitable. Both render paths now read public/home-schema.json.
 */
function homeStructuredData() {
  return {
    name: 'celestial-home-structured-data',
    transformIndexHtml() {
      return {
        tags: homeSchemas.map((schema, index) => ({
          tag: 'script',
          attrs: {
            type: 'application/ld+json',
            'data-celestial-home-schema': String(index + 1),
          },
          children: JSON.stringify(schema),
          injectTo: 'head' as const,
        })),
      };
    },
  };
}

export default defineConfig({
  plugins: [homeStructuredData(), react(), tailwindcss()],
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
