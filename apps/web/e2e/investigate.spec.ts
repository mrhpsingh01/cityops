import { test, expect } from '@playwright/test';

test('filter a trend, inspect matching records, and open request detail', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('5');
  await expect(page.getByText('Selected · 2025-01-18 to 2025-01-31')).toBeVisible();
  await expect(page.getByText('Prior · 2025-01-04 to 2025-01-17')).toBeVisible();
  await expect(page.locator('.movement-row')).toHaveCount(3);
  await expect(page.locator('.outcome-row')).toHaveCount(3);
  await expect(page.locator('.mix-row')).toHaveCount(4);
  await page.getByRole('link', { name: 'Weekly' }).click();
  await expect(page).toHaveURL(/grouping=week/);
  await expect(page.locator('.trend-pair')).toHaveCount(2);
  await page.getByRole('button', { name: 'Explain this chart' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Intake trend' })).toContainText('same length');
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: /Problem/ }).selectOption('HEAT/HOT WATER');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/problem=HEAT/);
  await expect(page).toHaveURL(/grouping=week/);
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('2');
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.request-table tbody tr')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /Export 2 rows/ })).toBeVisible();
  await page.getByRole('link', { name: 'fixture-h2' }).click();
  await expect(page.getByRole('dialog', { name: '#fixture-h2' })).toContainText('No closure recorded');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '#fixture-h2' })).toHaveCount(0);
});

test('mobile filter drawer applies the same URL state without page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: /Filter requests/ })).toBeVisible();
  await page.getByRole('button', { name: /Filter requests/ }).click();
  await expect(page.locator('#global-filter-form')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Filter requests' })).toBeVisible();
  await page.getByRole('combobox', { name: /Problem/ }).selectOption('HEAT/HOT WATER');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('2');
  await expect(page.locator('#global-filter-form')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'What each borough reports' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.request-card')).toHaveCount(2);
  await expect(page.locator('.request-table')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  const viewportFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(viewportFits).toBe(true);
});

test('borough problem segment cross-filters every overview view', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('link', { name: /BRONX, HEAT\/HOT WATER: 2 reports/ }).click();
  await expect(page).toHaveURL(/borough=BRONX/);
  await expect(page).toHaveURL(/problem=HEAT/);
  await expect(page.locator('.metric-card').first().locator('.metric-value')).toHaveText('2');
  await expect(page.locator('.movement-row')).toHaveCount(1);
  await expect(page.locator('.mix-row')).toHaveCount(1);
});

test('change map keeps its mode after selecting a borough', async ({ page }) => {
  await page.goto('/map?view=change');
  await expect(page.getByRole('heading', { name: 'Where reports changed.' })).toBeVisible();
  await page.getByRole('button', { name: /BRONX:.*Select borough/ }).click();
  await expect(page).toHaveURL(/view=change/);
  await expect(page).toHaveURL(/borough=BRONX/);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/view=change/);
});

test('invalid URL dates explain the filter problem', async ({ page }) => {
  await page.goto('/dashboard?from=2025-02-31&toExclusive=2025-03-02');
  await expect(page.locator('.error-panel')).toContainText('Check the selected filters');
  await expect(page.locator('.error-panel')).not.toContainText('Start PostgreSQL');
});

test('comparison before imported coverage is marked unavailable', async ({ page }) => {
  await page.goto('/dashboard?from=2025-01-05&toExclusive=2025-01-10');
  await expect(page.getByText('Prior · outside imported coverage')).toBeVisible();
  await expect(page.locator('.trend-col.prior')).toHaveCount(0);
  await page.goto('/map?from=2025-01-05&toExclusive=2025-01-10&view=change');
  await expect(page.getByRole('heading', { name: 'Prior period outside coverage' })).toBeVisible();
});
