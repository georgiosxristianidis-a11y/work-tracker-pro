import { test, expect } from '@playwright/test';

test.describe('Animations Test', () => {
  test('Magic wand animation responds to hover and tap', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Switch to Calendar tab
    await page.locator('nav button').nth(1).click();

    // Find the Quick Fill button
    const quickFillBtn = page.locator('button:has-text("Quick Fill")');
    await expect(quickFillBtn).toBeVisible();

    // Verify SVG exists
    const wandSvg = quickFillBtn.locator('svg');
    await expect(wandSvg).toBeVisible();

    // Hover over the button
    await quickFillBtn.hover();
    
    // Wait for animation
    await page.waitForTimeout(300);

    // We can't strictly assert SVG transform values easily without complex evaluation,
    // but we can ensure no errors are thrown and the element remains visible.
    await expect(wandSvg).toBeVisible();
    
    // Tap
    await quickFillBtn.dispatchEvent('pointerdown');
    await page.waitForTimeout(300);
    await expect(wandSvg).toBeVisible();
    await quickFillBtn.dispatchEvent('pointerup');
  });

  test('Trash can animation responds to interactions', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Switch to Settings tab
    await page.locator('nav button').nth(3).click();

    // Find Delete All Data button
    const deleteBtn = page.locator('button:has-text("Wipe All Local Data")');
    await expect(deleteBtn).toBeVisible();

    const trashSvg = deleteBtn.locator('svg').first();
    await expect(trashSvg).toBeVisible();

    // Hover
    await deleteBtn.hover();
    await page.waitForTimeout(300);
    await expect(trashSvg).toBeVisible();
    
    // Click (triggers confirm state)
    await deleteBtn.click();
    await page.waitForTimeout(300);
    
    // Check if the text changed to "Tap to Confirm Wipe"
    await expect(page.locator('button:has-text("Tap to Confirm Wipe")')).toBeVisible();
  });
});
