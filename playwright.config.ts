import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

const config: PlaywrightTestConfig = {
  testDir: "./tests/e2e",
  outputDir: "./tests/artifacts",
  timeout: 30_000,
  expect: {
    timeout: 8000,
  },
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./tests/support/globalSetup",
  use: {
    colorScheme: "dark",
    actionTimeout: 5000,
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
      },
    },
    {
      name: "visual-desktop",
      timeout: 60_000,
      expect: {
        timeout: 30_000,
        toHaveScreenshot: {
          threshold: 0.01,
          scale: "device",
          animations: "disabled",
        },
      },
      testDir: "./tests/visual/desktop",
      snapshotDir: "./tests/visual/snapshots/desktop",
      retries: 0,
      use: {
        ...devices["Desktop Chrome HiDPI"],
        actionTimeout: 0,
        trace: "off",
      },
    },
    {
      name: "visual-mobile",
      timeout: 60_000,
      expect: {
        timeout: 30_000,
        toHaveScreenshot: {
          threshold: 0.01,
          scale: "device",
          animations: "disabled",
        },
      },
      testDir: "./tests/visual/mobile",
      snapshotDir: "./tests/visual/snapshots/mobile",
      retries: 0,
      use: {
        ...devices["iPhone 13 Mini"],
        actionTimeout: 0,
        trace: "off",
      },
    },
  ],

  webServer: {
    // Use preview server (pre-built app) for main server - much faster startup
    command: "npm run serve -- --strictPort --port 3001",
    port: 3001,
  },
};

export default config;
