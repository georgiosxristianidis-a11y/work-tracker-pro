import { test, expect } from '@playwright/test';

test.describe('Save Button Test', () => {
  test('Should show Editor Modal and use new checkmark save', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Switch to calendar
    const calendarButton = page.locator('nav button').nth(1);
    await calendarButton.click();

    // Click on day 15
    const dayBtn = page.locator('button', { hasText: /^15$/ }).first();
    await dayBtn.click();
    
    // Save button should be visible
    const saveBtn = page.locator('button', { hasText: 'Save' });
    await expect(saveBtn).toBeVisible();

    // Hover over it
    await saveBtn.hover();
    await page.waitForTimeout(500);

    // Save
    await saveBtn.click();
  });
});
