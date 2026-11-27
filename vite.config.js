// @build: 2026-06-22 | id: PWA-CONFIG | desc: Configuración de Vite con plugin PWA para app instalable
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const buildId = `${pkg.version} - ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['icon-192-v2.png', 'icon-512-v2.png', 'apple-touch-icon-v2.png'],
      manifest: false,
      workbox: {
        clientsClaim: true,
        // El SW de Workbox importa el handler de push en el mismo scope.
        // Evita un segundo service worker que nunca recibiría la suscripción.
        importScripts: ['push-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    watch: {
      ignored: [
        '**/tests/.auth/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/blob-report/**'
      ]
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});