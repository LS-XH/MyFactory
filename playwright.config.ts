import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1920, height: 1080 }, launchOptions: process.env.PLAYWRIGHT_CHROME_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE } : undefined },
  webServer: { command: 'npm run dev -- --host 127.0.0.1', port: 5173, reuseExistingServer: true }
})
