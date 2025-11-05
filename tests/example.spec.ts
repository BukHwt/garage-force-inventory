import { test, expect } from '@playwright/test';

test.describe('Garage Force Inventory App', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // For now, just check that the React app loads
    await expect(page).toHaveTitle(/React App/);
  });

  test('should have mobile viewport', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      const viewportSize = page.viewportSize();
      expect(viewportSize?.width).toBeLessThanOrEqual(500);
    }
  });

  test('API health check should work', async ({ request }) => {
    const response = await request.get('http://localhost:5000/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});
