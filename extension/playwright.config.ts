import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Web Clipper Extension
 *
 * Includes:
 * - Accessibility testing project with axe-core
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Mobile viewport emulation
 * - CI/CD optimizations
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for test server (component test harness)
    baseURL: 'http://localhost:3000',

    // Collect trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10 * 1000,
  },

  // Visual regression test expectations
  expect: {
    toHaveScreenshot: {
      // Maximum allowed pixel difference
      maxDiffPixels: 100,
      // Maximum allowed percentage difference (0 = strict, 1 = lenient)
      maxDiffPixelRatio: 0.01,
      // Threshold for color difference (0 = strict, 1 = lenient)
      threshold: 0.2,
      // Disable animations for consistent snapshots
      animations: 'disabled',
    },
  },

  // Configure projects for different test types and browsers
  projects: [
    // Accessibility testing project (primary focus)
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Force light mode for consistent visual testing
        colorScheme: 'light',
      },
    },

    // Accessibility testing in dark mode
    {
      name: 'accessibility-dark',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },

    // Cross-browser accessibility testing
    {
      name: 'firefox-a11y',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit-a11y',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Safari'],
      },
    },

    // Mobile accessibility testing
    {
      name: 'mobile-a11y',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
      },
    },

    // Standard component tests
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.(a11y|visual)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.(a11y|visual)\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.(a11y|visual)\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },

    // Visual regression testing - light mode
    {
      name: 'visual-light',
      testMatch: /.*\.visual\.spec\.ts/,
      testIgnore: /.*dark mode.*/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        colorScheme: 'light',
      },
    },

    // Visual regression testing - dark mode
    {
      name: 'visual-dark',
      testMatch: /.*\.visual\.spec\.ts/,
      grep: /dark mode/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        colorScheme: 'dark',
      },
    },
  ],

  // Web server for component test harness
  webServer: {
    command: 'npx serve tests/fixtures -p 3000 -s',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
