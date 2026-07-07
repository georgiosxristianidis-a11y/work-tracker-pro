import { test, expect } from '@playwright/test';

test.describe('Animated Wand & Quick Fill', () => {
  test('Should navigate to Calendar and interact with Quick Fill wand', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Go to calendar
    const calendarButton = page.locator('nav button').nth(1);
    await calendarButton.click();
    
    // Verify the Quick Fill button exists
    const quickFillBtn = page.locator('button:has-text("Quick Fill")');
    await expect(quickFillBtn).toBeVisible();

    // Hover over Quick Fill to trigger animation
    await quickFillBtn.hover();
    
    // Wait for the hover animation to start (visual testing)
    await page.waitForTimeout(500);

    // Click to open modal
    await quickFillBtn.click();
    
    // Verify modal appeared
    await expect(page.locator('text=Quick Fill Calendar')).toBeVisible();
  });
});
