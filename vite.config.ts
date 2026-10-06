import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Back al que se reenvía /api en desarrollo (por defecto el local). No lleva el prefijo VITE_,
  // así no se incluye en el código que baja el navegador.
  const apiTarget = loadEnv(mode, process.cwd(), '').API_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      // El front llama a /api en su mismo dominio (igual que en Vercel): la cookie de sesión es propia.
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
        '/health': { target: apiTarget, changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './tests/setup.ts',
      // Los tests de e2e/ son de Playwright (npm run test:e2e), no de Vitest.
      exclude: ['**/node_modules/**', 'e2e/**'],
    },
  }
})
