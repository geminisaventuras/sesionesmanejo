// @build: 2026-06-18.15-00-00 | id: FINAL-INSCRIPCION | desc: Configuración anti-caché para Vite
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});
