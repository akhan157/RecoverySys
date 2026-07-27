import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4174/RecoverySys/'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  expect: { timeout: 10_000 },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: process.env.E2E_ARTIFACT_ONLY ? 'npm run e2e:serve:artifact' : 'npm run e2e:serve',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
