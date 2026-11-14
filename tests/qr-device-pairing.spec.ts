import { test, expect } from '@playwright/test';
import { encodePairingPayload } from '../src/lib/device-pairing';

test.describe('QR Device Pairing E2E', () => {
  test('1. Opens pairing modal from Settings and normalizes manual code input', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav button').nth(3).click();
    const pairBtn = page.locator('button', { hasText: /Pair Device \(QR Code\)/i });
    await expect(pairBtn).toBeVisible();
    await pairBtn.click();
    await expect(page.locator('h3', { hasText: 'Device Pairing' })).toBeVisible();
    await page.locator('button', { hasText: 'Have a code?' }).click();
    const input = page.locator('input[placeholder="6Q9E-VUBT"]');
    await input.fill('abcd2345');
    await expect(input).toHaveValue('ABCD-2345');
  });

  test('2. Applies valid offline P2P ?pair= URL payload and cleans URL query', async ({ page }) => {
    const valid = encodePairingPayload({
      v: 1,
      t: Date.now(),
      uid: 'remote-dev-1',
      code: 'ABCD-2345',
      entries: [{ date: '2026-11-10', hours: 8, updated_at: Date.now() }]
    });
    await page.goto(`/?pair=${encodeURIComponent(valid)}&code=ABCD-2345`);
    await expect(page).not.toHaveURL(/pair=/);
    await expect(page.locator('h4', { hasText: 'Device Detected' })).toBeVisible();
    await page.locator('button', { hasText: 'Merge entries (Smart Merge)' }).click();
    await expect(page.locator('h4', { hasText: 'Device Connected' })).toBeVisible();
  });

  test('3. Rejects expired ?pair= URL payload against replay', async ({ page }) => {
    const expired = encodePairingPayload({
      v: 1,
      t: Date.now() - 15 * 60 * 1000,
      uid: 'remote-dev-2',
      entries: [{ date: '2026-11-11', hours: 8 }]
    });
    await page.goto(`/?pair=${encodeURIComponent(expired)}`);
    await expect(page).not.toHaveURL(/pair=/);
    await expect(page.locator('h4', { hasText: 'Device Detected' })).toHaveCount(0);
  });
});
