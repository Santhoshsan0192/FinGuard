import { test, expect } from '@playwright/test';

test.describe('Authentication \u0026 Dashboard Navigation', () => {
  test('should login successfully as analyst and view dashboard', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/.*\/login/);

    // Fill in the login form
    await page.fill('input[type="text"]', 'analyst');
    await page.fill('input[type="password"]', 'analyst123');
    
    // Submit
    await page.click('button[type="submit"]');

    // Wait for redirect to analyst dashboard
    await expect(page).toHaveURL(/.*\/analyst/);

    // Verify Dashboard Title is visible
    await expect(page.locator('h1').filter({ hasText: 'Fraud Analyst Overview' })).toBeVisible();
    
    // Check Top KPIs
    await expect(page.locator('text=Total Scored in Batch')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator('text=/Invalid (username or password|credentials)/')).toBeVisible();
    // Ensure we are still on the login page
    await expect(page).toHaveURL(/.*\/login/);
  });
});
