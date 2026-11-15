import { test, expect } from '@playwright/test';

test.describe('Rocket Zero State Test', () => {
  test('Should display rocket when total hours and earnings are zero', async ({ page }) => {
    await page.goto('/');
    
    // Check that we see the rocket placeholder text (or title)
    // The rocket has a title "Start Work" when it is acting for "hours" zero state
    // But in our HomeScreen, we pass type="hours" to AnimatedZero (which has the rocket)
    // Wait for the text to appear
    const rocketZero = page.locator('div[title="Start Work"]');
    await expect(rocketZero).toBeVisible();

    // The stats row should be invisible (opacity-0) when there are no hours
    const statsGrid = page.getByTestId('monthly-stats');
    await expect(statsGrid).toHaveClass(/opacity-0/);
    
    // Interact with rocket to go to calendar
    await rocketZero.click();
    
    // We should be navigated to calendar tab
    // Let's just check if calendar UI is visible, e.g. "Quick Fill" or "Month" navigation inside Calendar
    await expect(page.locator('button:has-text("Quick Fill")')).toBeVisible();
  });

  test('Should coil and catapult rocket with hold gesture', async ({ page }) => {
    await page.goto('/');

    const rocketZero = page.locator('div[title="Start Work"]');
    await expect(rocketZero).toBeVisible();
    await expect(rocketZero).toHaveAttribute('data-rocket-state', 'idle');

    const box = await rocketZero.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(160);
      await expect(rocketZero).toHaveAttribute('data-rocket-state', 'charging');
      await expect(rocketZero).toHaveAttribute('data-rocket-state', 'launching', { timeout: 1200 });
      await page.mouse.up();
    }

    await expect(page.locator('button:has-text("Quick Fill")')).toBeVisible({ timeout: 3000 });
  });
});
