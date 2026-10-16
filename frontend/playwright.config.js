import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

const defaultMvn = 'C:\\Users\\Santhosh\\.maven\\apache-maven-3.9.8\\bin\\mvn.cmd';
const mvnPath = fs.existsSync(defaultMvn) ? `"${defaultMvn}"` : 'mvn';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `cd ../backend && ${mvnPath} spring-boot:run`,
      url: 'http://localhost:8080/api/auth/me',
      reuseExistingServer: true,
      timeout: 120 * 1000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
  ],
});
