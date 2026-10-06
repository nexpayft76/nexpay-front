import { defineConfig, devices } from '@playwright/test'

const PORT = 5174

// Tests end to end: un Chromium real contra el front levantado con Vite.
// El backend NO se usa: cada test intercepta /api con e2e/support/mock-api.ts, así corren sin red ni base de datos.
export default defineConfig({
  testDir: './e2e/tests',
  testMatch: '**/*.e2e.ts',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // En CI hay pocos núcleos: menos tests en paralelo evita falsos fallos por lentitud.
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'e2e/.report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
