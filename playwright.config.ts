import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command: "node tests/browser/supabase-fixture.mjs",
      port: 54329,
      reuseExistingServer: false,
    },
    {
      command: "pnpm exec next dev --port 3100",
      port: 3100,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_APP_URL: "http://localhost:3100",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-publishable",
        SUPABASE_SERVICE_ROLE_KEY: "fixture-service",
        RATE_LIMIT_SALT: "fixture-salt",
      },
    },
  ],
});
