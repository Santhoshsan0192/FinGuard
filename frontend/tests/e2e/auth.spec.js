import { test, expect } from '@playwright/test';

test.describe('Authentication \u0026 Protected Routes', () => {
  
  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator('text=/Invalid (username or password|credentials)/')).toBeVisible();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Unauthenticated user is redirected from protected routes', async ({ page }) => {
    await page.goto('/admin');
    // Should be redirected to login
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/analyst');
    await expect(page).toHaveURL(/.*\/login/);
  });
  
  test('Analyst cannot access Admin routes', async ({ page }) => {
    // Login as analyst
    await page.goto('/login');
    await page.fill('input[type="text"]', 'analyst');
    await page.fill('input[type="password"]', 'analyst123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await expect(page).toHaveURL(/.*\/analyst/);
    
    // Attempt to access admin route
    await page.goto('/admin');
    
    // Should be redirected back to analyst dashboard (unauthorized)
    await expect(page).toHaveURL(/.*\/analyst/);
  });
});
