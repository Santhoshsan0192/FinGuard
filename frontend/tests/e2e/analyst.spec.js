import { test, expect } from '@playwright/test';

test.describe('Analyst Workflows', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate and login before each test
    await page.goto('/login');
    await page.fill('input[type="text"]', 'analyst');
    await page.fill('input[type="password"]', 'analyst123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/analyst/);
  });

  test('Dashboard metrics and alert rendering', async ({ page }) => {
    // Check Top KPIs
    await expect(page.locator('text=Total Scored in Batch')).toBeVisible();
    await expect(page.locator('text=Active Alerts')).toBeVisible();
    await expect(page.locator('text=Confirmed Fraud')).toBeVisible();

    // Navigate to alerts queue
    await page.click('a:has-text("Fraud Alerts")');
    await expect(page).toHaveURL(/.*\/analyst\/alerts/);

    // Verify alerts table is populated
    await expect(page.locator('table')).toBeVisible();
    
    // Check that we have at least one alert row
    const rows = page.locator('tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('Clicking Explain opens correct customer details and SHAP rendering', async ({ page }) => {
    // Navigate to alerts queue
    await page.click('a:has-text("Fraud Alerts")');
    await expect(page.locator('table')).toBeVisible();
    
    // Wait for loading to finish
    await expect(page.locator('text=Loading prioritized alerts')).not.toBeVisible({ timeout: 15000 });
    
    // Click the first alert row
    const firstRow = page.locator('tbody tr').filter({ hasNotText: 'Loading' }).filter({ hasNotText: 'No alerts found' }).first();
    await firstRow.click();

    // Verify it stays on the same page but opens the details inline
    await expect(page).toHaveURL(/.*\/analyst\/alerts/);

    // Check SHAP explanation rendering in the expanded row
    await expect(page.locator('text=Explainable AI: Risk Driver Attribution')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Population Base Expected Log-Odds')).toBeVisible({ timeout: 15000 });
  });

  test('Updating an alert status to Confirmed Fraud with confirmation dialog', async ({ page }) => {
    // Navigate to alerts queue
    await page.click('a:has-text("Fraud Alerts")');
    
    await expect(page.locator('text=Loading prioritized alerts')).not.toBeVisible({ timeout: 15000 });
    
    // Go to first alert details
    await page.locator('tbody tr').filter({ hasNotText: 'Loading' }).filter({ hasNotText: 'No alerts found' }).first().click();
    
    // Click "Confirm Fraud" button to open modal
    const fraudButton = page.locator('button:has-text("Confirm Fraud")');
    await fraudButton.click({ timeout: 15000 });
    
    // Check that the confirmation dialog appears
    await expect(page.locator('text=Confirm Status Change')).toBeVisible();
    
    // Fill the rationale
    await page.fill('textarea[placeholder="Enter your mandatory investigation rationale..."]', 'Found matching device fingerprint with known fraudster.');
    
    // Submit
    const confirmSaveBtn = page.locator('button:has-text("Confirm & Save")');
    await confirmSaveBtn.click();

    // The row will disappear from Active Alerts because its status changed.
    // Click the Confirmed Fraud tab to verify it moved.
    await page.click('button:has-text("Confirmed Fraud")');
    await expect(page.locator('text=Loading prioritized alerts')).not.toBeVisible({ timeout: 15000 });

    // Verify persistence
    await expect(page.locator('span').filter({ hasText: /^CONFIRMED FRAUD$/ }).first()).toBeVisible({ timeout: 15000 });
  });

  test('Updating an alert status to False Positive', async ({ page }) => {
    await page.click('a:has-text("Fraud Alerts")');
    await expect(page.locator('text=Loading prioritized alerts')).not.toBeVisible({ timeout: 15000 });
    
    await page.locator('tbody tr').filter({ hasNotText: 'Loading' }).filter({ hasNotText: 'No alerts found' }).first().click();
    
    const fpButton = page.locator('button', { hasText: /^False Positive$/ });
    await fpButton.click({ timeout: 15000 });
    
    await expect(page.locator('text=Confirm Status Change')).toBeVisible();
    await page.fill('textarea[placeholder="Enter your mandatory investigation rationale..."]', 'Customer verified via phone call.');
    
    await page.locator('button:has-text("Confirm & Save")').click();

    // The row will disappear from Active Alerts because its status changed.
    // Click the False Positives tab to verify it moved.
    await page.click('button:has-text("False Positives")');
    await expect(page.locator('text=Loading prioritized alerts')).not.toBeVisible({ timeout: 15000 });

    await expect(page.locator('span').filter({ hasText: /^FALSE POSITIVE$/ }).first()).toBeVisible({ timeout: 15000 });
  });

  test('Logout', async ({ page }) => {
    // Assuming a generic logout button/icon exists in header
    await page.locator('button[title="Logout"], a:has-text("Logout"), button:has-text("Logout")').first().click();
    
    // Should be back at login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
