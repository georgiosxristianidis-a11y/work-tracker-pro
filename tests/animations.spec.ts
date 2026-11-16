import { test, expect } from '@playwright/test';

test.describe('Animations Test', () => {
  test('Magic wand animation responds to hover and tap', async ({ page }) => {
    await page.goto('/');
    
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
    await expect(wandSvg).toBeVisible();
    
    // Tap
    await quickFillBtn.dispatchEvent('pointerdown');
    await expect(wandSvg).toBeVisible();
    await quickFillBtn.dispatchEvent('pointerup');
  });

  test('Opal hold-to-wipe button requires long hold to wipe data', async ({ page }) => {
    await page.goto('/');

    // Switch to Settings tab
    await page.locator('nav button').nth(3).click();

    const wipeBtn = page.locator('#danger-wipe-btn');
    await expect(wipeBtn).toBeVisible();
    await expect(wipeBtn).toContainText('Wipe Data');
    await expect(wipeBtn).toHaveAttribute('data-hold-state', 'idle');
    // Light theme keeps obsidian dark + light ink pattern rather than turning cream/white
    const wipeColor = await wipeBtn.evaluate((el) => getComputedStyle(el).color);
    expect(wipeColor).toBe('rgb(244, 241, 234)');

    const trashSvg = wipeBtn.locator('svg').first();
    await expect(trashSvg).toBeVisible();

    // Quick click shows hold hint instead of wiping immediately
    await wipeBtn.click();
    await expect(wipeBtn).toContainText('Hold to Confirm');
    await expect(wipeBtn).toHaveAttribute('data-hold-state', 'idle');

    // Long press hold engages radial fill and executes wipe at >= 900ms
    await wipeBtn.scrollIntoViewIfNeeded();
    const box = await wipeBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(180);
      await expect(wipeBtn).toHaveAttribute('data-hold-state', 'holding');
      await expect(wipeBtn).toContainText('Keep Holding...');
      await expect(wipeBtn).toHaveAttribute('data-hold-state', 'complete', { timeout: 2000 });
      await expect(wipeBtn).toContainText('All data deleted');
      await page.mouse.up();
    }
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible({ timeout: 3000 });
  });

  test('Orbital indicator reverses rotation direction on click', async ({ page }) => {
    await page.goto('/');

    const orbital = page.locator('canvas[data-orbital]');
    await expect(orbital).toBeVisible();
    await expect(orbital).toHaveAttribute('data-dir', 'cw');

    await orbital.click();
    await expect(orbital).toHaveAttribute('data-dir', 'ccw');
    // Must stay on Home rather than bubbling into Shift Stopwatch navigation
    await expect(page.getByTestId('monthly-stats')).toBeAttached();

    await orbital.click();
    await expect(orbital).toHaveAttribute('data-dir', 'cw');
  });

  test('Minimalist icon-only dock keeps active top line lit and pulses on tab click', async ({ page }) => {
    await page.goto('/');

    const navButtons = page.locator('nav button');
    await expect(navButtons).toHaveCount(4);
    await expect(navButtons.nth(0)).toHaveText('');
    await expect(navButtons.nth(0).locator('.wt-nav-topline.is-active')).toBeVisible();

    await navButtons.nth(2).click();
    await expect(navButtons.nth(0).locator('.wt-nav-topline')).toHaveCount(0);
    const activeTopline = navButtons.nth(2).locator('.wt-nav-topline.is-pulsing');
    await expect(activeTopline).toBeVisible();

    await page.waitForTimeout(900);
    const settledOpacity = await activeTopline.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
    expect(settledOpacity).toBeGreaterThan(0.85);

    const hasHorizontalOverflow = await page.evaluate(() => {
      const scroller = document.querySelector('#frame > div.overflow-y-auto');
      return scroller ? scroller.scrollWidth > scroller.clientWidth : true;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
