import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {}),
    baseURL:'http://127.0.0.1:4180',
    viewport:{width:1440,height:900},
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  webServer:{
    command:'node tests/site-preview.mjs',
    url:'http://127.0.0.1:4180',
    reuseExistingServer:false,
  },
})
