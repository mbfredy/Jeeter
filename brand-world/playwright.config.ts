import { defineConfig, devices } from '@playwright/test';

// Tests run against the production build, so they exercise the real age gate.
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    // Software WebGL so screenshots match across machines without a GPU.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testMatch: /e2e\/.*\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /world\.spec/ },
    { name: 'node', testMatch: /validator\.spec|rules\.spec/ },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
