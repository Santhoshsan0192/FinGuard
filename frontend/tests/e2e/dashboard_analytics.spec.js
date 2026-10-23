import { test, expect } from '@playwright/test';

test.describe('Dashboard Analytics & Visualizations Regression', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'analyst');
    await page.fill('input[type="password"]', 'analyst123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/analyst/);
  });

  test('Risk Distribution displays 2,200 scored population and accurate risk tiers', async ({ page }) => {
    // Check Risk Distribution section header and 2,200 Scored badge
    await expect(page.getByRole('heading', { name: 'Risk Distribution' })).toBeVisible();
    await expect(page.getByText('2,200 Scored', { exact: true })).toBeVisible();
    
    // Check risk category counts using exact match
    await expect(page.getByText('2,066', { exact: true })).toBeVisible(); // Low risk count
    await expect(page.getByText('115', { exact: true })).toBeVisible();   // High risk count
    await expect(page.getByText('19', { exact: true })).toBeVisible();    // Medium risk count

    // Check proportional percentages
    await expect(page.getByText('93.9%')).toBeVisible(); // Low risk %
    await expect(page.getByText('5.2%')).toBeVisible();  // High risk %
  });

  test('Real Risk Trend supports Hourly, Daily, and Batches mode switching with data points', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Real Risk Trend' })).toBeVisible();

    // Default: Hourly
    await expect(page.locator('button:has-text("Hourly")')).toHaveClass(/bg-zinc-700/);
    await expect(page.getByText('Points: 24')).toBeVisible();

    // Switch to Daily
    await page.click('button:has-text("Daily")');
    await expect(page.getByText('Points: 7')).toBeVisible();

    // Switch to Batches
    await page.click('button:has-text("Batches")');
    await expect(page.getByText('Points: 3')).toBeVisible();
    await expect(page.getByRole('combobox')).toHaveValue('BATCH-2026-0003');
  });

  test('Top Risk Drivers displays human-readable descriptions, technical features, and TreeSHAP units', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Top Risk Drivers' })).toBeVisible();
    await expect(page.getByText('Attribution: TreeSHAP Global')).toBeVisible();
    await expect(page.getByText('Mean |SHAP| (Log-Odds)')).toBeVisible();

    // Check that human-readable descriptions are visible
    await expect(page.getByText('Distance from Billing Address')).toBeVisible();
    await expect(page.getByText('Spending to Customer Baseline Ratio')).toBeVisible();
    await expect(page.getByText('Transaction Frequency Counter C2')).toBeVisible();

    // Verify technical feature codes are also rendered below descriptions
    await expect(page.getByText('dist1')).toBeVisible();
    await expect(page.getByText('amt_to_baseline_ratio')).toBeVisible();
    await expect(page.locator('span.font-mono.text-zinc-500').filter({ hasText: /^C2$/ })).toBeVisible();
  });

  test('KPI Cards show 2,200 total scored and alert queue breakdown', async ({ page }) => {
    await expect(page.getByText('Total Scored in Batch')).toBeVisible();
    await expect(page.getByText('2,200', { exact: true })).toBeVisible();

    await expect(page.getByText('Active Alerts')).toBeVisible();
    await expect(page.getByText('Confirmed Fraud')).toBeVisible();
    await expect(page.getByText('False Positives')).toBeVisible();

    // Average risk score & fraud rate in header
    await expect(page.getByText('Avg Risk Score')).toBeVisible();
    await expect(page.locator('text=6.1').first()).toBeVisible();
    await expect(page.getByText('85.8%')).toBeVisible();
  });

  test('Batch & Model Traceability panel displays operational pipeline audit metrics', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Batch.*Model Traceability/ })).toBeVisible();
    await expect(page.getByText('Pipeline Execution Status:')).toBeVisible();
    await expect(page.locator('span.text-emerald-400.uppercase').filter({ hasText: 'COMPLETED' })).toBeVisible();
    await expect(page.getByText('Scored Population')).toBeVisible();
    await expect(page.getByText('Flagged Queue Alerts')).toBeVisible();
    await expect(page.getByText('Auto-Cleared Low Risk')).toBeVisible();
  });
});
