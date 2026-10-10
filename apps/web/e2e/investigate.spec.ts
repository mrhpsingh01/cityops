import { test, expect } from '@playwright/test';

test('filter a trend, inspect matching records, and open request detail', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('5');
  await page.getByRole('combobox', { name: /Problem/ }).selectOption('HEAT/HOT WATER');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/problem=HEAT/);
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('2');
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.request-table tbody tr')).toHaveCount(2);
  await page.getByRole('link', { name: 'fixture-h2' }).click();
  await expect(page.getByRole('complementary', { name: 'Request details' })).toContainText('No closure recorded');
});

test('mobile filter drawer applies the same URL state without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /Filter requests/ })).toBeVisible();
  await page.getByRole('button', { name: /Filter requests/ }).click();
  await expect(page.locator('#global-filter-form')).toBeVisible();
  await page.getByRole('combobox', { name: /Problem/ }).selectOption('HEAT/HOT WATER');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('2');
  await expect(page.locator('#global-filter-form')).toBeHidden();
  const viewportFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(viewportFits).toBe(true);
});
