import { test, expect } from '@playwright/test';

test.describe('Work Tracker Pro Navigation', () => {

  test('Should load and display the home screen correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Check if the home screen logo and title are visible
    await expect(page.locator('text=Work Tracker Pro').first()).toBeVisible();
    
    // Check navigation bar existence
    await expect(page.locator('nav')).toBeVisible();
  });

  test('Should switch to the Analytics chart view', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Find the analytics icon from bottom navigation
    const chartButton = page.locator('nav button').nth(2);
    await chartButton.click();
    
    // Verify the Analytics header appears
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();
  });

  test('Should switch to the Settings view', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Find the settings icon from bottom navigation
    const settingsButton = page.locator('nav button').nth(3);
    await settingsButton.click();
    
    // Verify the Settings header appears
    await expect(page.locator('span:has-text("Settings"), h1:has-text("Settings")').first()).toBeVisible();
    
    // Confirm Version exists
    await expect(page.locator('text=Version V1.024')).toBeVisible();
  });

});
