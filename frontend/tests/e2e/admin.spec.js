import { test, expect } from '@playwright/test';

test.describe('Admin Workflows \u0026 Empty States', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate and login before each test
    await page.goto('/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/admin/);
  });

  test('Admin dashboard loading states and tables', async ({ page }) => {
    // Check Top KPIs
    await expect(page.locator('text=System Administration')).toBeVisible();
    await expect(page.locator('text=Active Administrators')).toBeVisible();

    // Navigate to Batches
    await page.click('a:has-text("Batches")');
    await expect(page).toHaveURL(/.*\/admin\/batches/);
    
    // Check for table visibility
    await expect(page.locator('table')).toBeVisible();
  });

  test('Protected route access (Admin vs Analyst)', async ({ page }) => {
    // Admin trying to access analyst routes (should be allowed per RBAC)
    await page.goto('/analyst/alerts');
    // Ensure we don't get kicked out to login
    await expect(page).not.toHaveURL(/.*\/login/);
  });
  
  test('Empty state for invalid customer search', async ({ page }) => {
    // As an admin, go to Analyst customers page (accessible via RBAC)
    await page.goto('/analyst/customers');
    
    // Search for a non-existent customer
    await page.fill('input[type="text"]', 'CUST_DOES_NOT_EXIST');
    await page.click('button:has-text("Search")');
    
    // Wait for empty state or error message
    await expect(page.getByText(/No matches for/)).toBeVisible();
  });
});
