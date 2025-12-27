import { test, expect } from '@playwright/test';

test('app loads and displays basic UI', async ({ page }) => {
  await page.goto('/');

  // Check that the page loaded and contains the app name
  // This will be present either in "Welcome to WLED Pro" or "WLED Pro" header
  await expect(page.getByText(/WLED Pro/i)).toBeVisible();

  // Verify we have a working React app (check for root element)
  const root = page.locator('#root');
  await expect(root).toBeVisible();
});
