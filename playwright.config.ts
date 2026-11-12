import { defineConfig, devices } from '@playwright/test'

/**
 * - Base: build otimizado servido pelo `vite preview` (mesmo artefato do deploy), com MSW ativo.
 *   Para iterar contra o dev server: PW_BASE_URL=http://localhost:5173 npx playwright test
 * - Cada teste roda em um contexto novo (storage/Service Worker isolados) e aplica o cenário
 *   determinístico `fast` (ver tests/helpers/app.ts).
 */
const baseURL = process.env.PW_BASE_URL ?? 'http://localhost:4173'

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 8_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide' } },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'desktop-chromium', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chromium', testDir: './tests/e2e', grep: /@mobile/, use: { ...devices['Pixel 7'] } },
    { name: 'visual', testDir: './tests/visual', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  ],
  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
})
