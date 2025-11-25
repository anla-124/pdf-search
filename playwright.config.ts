import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

/**
 * Playwright Configuration for PDF Searcher
 *
 * This configuration is optimized for API testing with some E2E browser tests.
 * Tests run against your local development server.
 */
export default defineConfig({
  // Test directory
  testDir: './tests',

  // Timeout for each test (30 seconds for API, 60 seconds for E2E)
  timeout: 60 * 1000,

  // Timeout for expect() assertions
  expect: {
    timeout: 10 * 1000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail fast on CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests once in CI, not locally
  retries: process.env.CI ? 1 : 0,

  // Number of parallel workers (use half of CPU cores locally)
  workers: process.env.CI ? 2 : undefined,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Global test setup/teardown
  globalSetup: './tests/global-setup.ts',

  // Shared settings for all tests
  use: {
    // Base URL for API tests
    baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

    // Collect trace on first retry of failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure (for E2E tests)
    video: 'retain-on-failure',

    // Extra HTTP headers (if needed)
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // Test projects for different test types
  projects: [
    // API Tests (no browser needed, runs fast)
    {
      name: 'api',
      testMatch: /.*\.api\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // API tests don't need a browser context
        headless: true,
      },
    },

    // Integration Tests (combines API + some UI checks)
    {
      name: 'integration',
      testMatch: /.*\.integration\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },

    // E2E Tests (full browser automation)
    {
      name: 'e2e-chromium',
      testMatch: /.*\.e2e\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },

    // Smoke Tests (critical path only, runs fastest)
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],

  // Web server configuration (auto-start dev server for testing)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
