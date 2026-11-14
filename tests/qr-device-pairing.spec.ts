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

  test('4. Dual-device handshake: Guest scans Host QR screenshot & both reach Device Connected', async ({ context }) => {
    const hostPage = await context.newPage();
    await hostPage.goto('/');

    // Add 1 work shift entry on Host so offline QR embeds payload.entries
    await hostPage.locator('nav button').nth(1).click();
    await hostPage.locator('button', { hasText: /^15$/ }).first().click({ button: 'right' });
    const saveBtn = hostPage.locator('button', { hasText: 'Save' });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(saveBtn).not.toBeVisible();

    // Open Host pairing modal and capture real rendered QR plate PNG
    await hostPage.locator('nav button').nth(3).click();
    await hostPage.locator('button', { hasText: /Pair Device \(QR Code\)/i }).click();
    const qrCanvas = hostPage.locator('[data-testid="branded-qr-canvas"]');
    await expect(qrCanvas.locator('svg')).toBeVisible({ timeout: 5000 });
    await hostPage.waitForTimeout(400);
    const qrBuffer = await qrCanvas.locator('xpath=..').screenshot();

    // Open Guest in same context (shares BroadcastChannel) with distinct device_id
    const guestPage = await context.newPage();
    await guestPage.addInitScript(() => {
      const origGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key: string) {
        if (key === 'device_id') return 'guest-device-e2e';
        return origGetItem.call(this, key);
      };
    });
    await guestPage.goto('/');
    await guestPage.locator('nav button').nth(3).click();
    await guestPage.locator('button', { hasText: /Pair Device \(QR Code\)/i }).click();
    await guestPage.locator('button', { hasText: 'Have a code?' }).click();
    await guestPage.locator('button', { hasText: 'Open Scanner' }).click();

    // Upload Host's rendered QR screenshot directly into Guest scanner
    const fileInput = guestPage.locator('input[type="file"][accept="image/*"]').last();
    await fileInput.setInputFiles({ name: 'host-qr.png', mimeType: 'image/png', buffer: qrBuffer });

    await expect(guestPage.locator('h4', { hasText: 'Device Detected' })).toBeVisible({ timeout: 5000 });
    await guestPage.locator('button', { hasText: 'Merge entries (Smart Merge)' }).click();

    // Verify dual-screen live confirmation (Elara pattern)
    await expect(guestPage.locator('h4', { hasText: 'Device Connected' })).toBeVisible({ timeout: 5000 });
    await expect(hostPage.locator('h4', { hasText: 'Device Connected' })).toBeVisible({ timeout: 5000 });
  });

  test('5. Manual 8-char code dual-device handshake: Guest enters Host code & both reach Device Connected', async ({ context }) => {
    const hostPage = await context.newPage();
    await hostPage.goto('/');
    await hostPage.locator('nav button').nth(3).click();
    await hostPage.locator('button', { hasText: /Pair Device \(QR Code\)/i }).click();

    const codeEl = hostPage.locator('span.font-mono.tracking-widest').first();
    await expect(codeEl).toBeVisible({ timeout: 5000 });
    const hostCode = (await codeEl.textContent())?.trim() ?? '';
    expect(hostCode).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);

    const guestPage = await context.newPage();
    await guestPage.addInitScript(() => {
      const origGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key: string) {
        if (key === 'device_id') return 'guest-device-code-e2e';
        return origGetItem.call(this, key);
      };
    });
    await guestPage.goto('/');
    await guestPage.locator('nav button').nth(3).click();
    await guestPage.locator('button', { hasText: /Pair Device \(QR Code\)/i }).click();
    await guestPage.locator('button', { hasText: 'Have a code?' }).click();

    await guestPage.locator('input[placeholder="6Q9E-VUBT"]').fill(hostCode);
    await guestPage.locator('button', { hasText: 'Link with code' }).click();

    await expect(guestPage.locator('h4', { hasText: 'Device Connected' })).toBeVisible({ timeout: 5000 });
    await expect(hostPage.locator('h4', { hasText: 'Device Connected' })).toBeVisible({ timeout: 5000 });
  });
});
