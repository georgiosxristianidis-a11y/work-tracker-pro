import { test, expect } from '@playwright/test';

test.describe('Save Button Test', () => {
  test('Should show Editor Modal and use new checkmark save', async ({ page }) => {
    await page.goto('/');
    
    // Switch to calendar
    const calendarButton = page.locator('nav button').nth(1);
    await calendarButton.click();

    // Right-click or long-press on day 15 to open editor modal
    const dayBtn = page.locator('button', { hasText: /^15$/ }).first();
    await dayBtn.click({ button: 'right' });
    
    // Save button should be visible
    const saveBtn = page.locator('button', { hasText: 'Save' });
    await expect(saveBtn).toBeVisible();

    // Hover over it
    await saveBtn.hover();

    // Save
    await saveBtn.click();
    await expect(saveBtn).not.toBeVisible();
  });
});
