import { test, expect } from '@playwright/test';
import { decodePairingPayload, encodePairingPayload, mergeEntries, PairingPayload } from '../src/lib/device-pairing';
import { Entry } from '../src/lib/db';

test.describe('Live Verification: New Features & Tasks', () => {

  test('1. Topbar and Hero space air: titles removed, logo & clock intact', async ({ page }) => {
    await page.goto('/');

    // 1.1 Verify "Work Tracker Pro" visible text is absent from Topbar
    const topbarText = page.locator('div.absolute').first().locator('span:has-text("Work Tracker Pro")');
    await expect(topbarText).toHaveCount(0);

    // 1.2 Verify Logo button exists with correct aria-label and clock is present
    const logoButton = page.locator('button[aria-label="Work Tracker Pro"]');
    await expect(logoButton).toBeVisible();

    // 1.3 Verify Clock is ticking inside Topbar
    const clock = logoButton.locator('span.text-micro');
    await expect(clock).toBeVisible();
    await expect(clock).toHaveText(/\d{2}:\d{2}/);

    // 1.4 Verify "PRO ENGINE" micro-header is absent from hero card
    const heroMicroHeader = page.locator('text=PRO ENGINE');
    await expect(heroMicroHeader).toHaveCount(0);
  });

  test('2. Bank-grade Privacy mode masks numbers with ••••', async ({ page }) => {
    await page.goto('/');

    const privacyButton = page.locator('button[aria-label="Hide Earnings"], button[aria-label="Show Earnings"]').first();
    await expect(privacyButton).toBeVisible();

    // Turn privacy on
    await privacyButton.click();

    // Verify •••• appears in balance/card
    const bulletText = page.locator('text=••••').filter({ visible: true });
    await expect(bulletText.first()).toBeVisible();

    // Turn privacy off
    await privacyButton.click();
    await page.waitForTimeout(300);
  });

  test('3. Device Pairing: QR Code generates 100% offline (no missing cloud error)', async ({ page }) => {
    await page.goto('/');

    // Navigate to Settings
    const settingsTab = page.locator('nav button').nth(3);
    await settingsTab.click();

    // Verify Settings Screen loaded
    await expect(page.locator('[data-testid="settings-title"], span:has-text("Settings"), span:has-text("Настройки"), span:has-text("Ρυθμίσεις")').first()).toBeVisible();

    // Find and click the Device Pairing button
    const pairButton = page.locator('button:has-text("Pair Device"), button:has-text("Привязать устройство")').first();
    await pairButton.scrollIntoViewIfNeeded();
    await expect(pairButton).toBeVisible();
    await pairButton.click();

    // Verify modal is open and has "Синхронизация устройств"
    await expect(page.locator('h3:has-text("Синхронизация устройств"), h3:has-text("Device Pairing")').first()).toBeVisible();

    // CRITICAL: Verify that the error message "Для сопряжения необходима настройка облачного подключения" is NOT displayed!
    const cloudError = page.locator('text=Для сопряжения необходима настройка облачного подключения');
    await expect(cloudError).toHaveCount(0);

    // Verify QR Code container is rendered (SECURE SYNC badge + QR Code SVG)
    await expect(page.locator('text=SECURE SYNC')).toBeVisible({ timeout: 5000 });
    const qrSvg = page.locator('div:has-text("SECURE SYNC") svg').first();
    await expect(qrSvg).toBeVisible({ timeout: 5000 });

    // Verify copy button is present and clickable
    const copyButton = page.locator('button:has-text("Копировать"), button:has-text("Copy")').first();
    await expect(copyButton).toBeVisible();
  });

  test('4. Logic check: P2P payload encoding, decoding and Smart Merge', async () => {
    const sampleEntries: Entry[] = [
      { date: '2026-10-01', hours: 8, month: '2026-10', updated_at: 1000 },
      { date: '2026-10-02', hours: 6, month: '2026-10', updated_at: 2000 }
    ];

    const payload: PairingPayload = {
      v: 1,
      t: Date.now(),
      uid: 'device-test-123',
      dev: 'device-test-123',
      entries: sampleEntries.map(e => ({ date: e.date, hours: e.hours, updated_at: e.updated_at }))
    };

    // Encode
    const encoded = encodePairingPayload(payload);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe('string');

    // Decode
    const decoded = decodePairingPayload(`https://example.com/?pair=${encoded}`);
    expect(decoded).not.toBeNull();
    expect(decoded?.uid).toBe('device-test-123');
    expect(decoded?.entries?.length).toBe(2);
    expect(decoded?.entries?.[0].hours).toBe(8);

    // Merge logic
    const existingLocal: Entry[] = [
      { date: '2026-10-01', hours: 4, month: '2026-10', updated_at: 500 },
      { date: '2026-10-03', hours: 7, month: '2026-10', updated_at: 3000 }
    ];

    const remoteEntries: Entry[] = decoded!.entries!.map(e => ({
      date: e.date,
      hours: e.hours,
      month: e.date.substring(0, 7),
      updated_at: e.updated_at
    }));

    const result = mergeEntries(existingLocal, remoteEntries);
    expect(result.merged.length).toBe(3);
    const oct1 = result.merged.find(e => e.date === '2026-10-01');
    expect(oct1?.hours).toBe(8);
  });

  test('5. Safe Union Guarantee: remote 0 hours / empty base NEVER wipes local entries', async () => {
    const sacredLocalEntries: Entry[] = [
      { date: '2026-10-01', hours: 8, month: '2026-10', updated_at: 1000 },
      { date: '2026-10-02', hours: 7.5, month: '2026-10', updated_at: 1000 }
    ];

    // Remote tries to delete 2026-10-01 by sending 0 hours with newer timestamp
    const adversarialRemoteEntries: Entry[] = [
      { date: '2026-10-01', hours: 0, month: '2026-10', updated_at: 9999 }
    ];

    const result = mergeEntries(sacredLocalEntries, adversarialRemoteEntries);

    // Assert that local 8 hours and 7.5 hours are NEVER wiped out
    expect(result.merged.length).toBe(2);
    const oct1 = result.merged.find(e => e.date === '2026-10-01');
    expect(oct1?.hours).toBe(8);
    const oct2 = result.merged.find(e => e.date === '2026-10-02');
    expect(oct2?.hours).toBe(7.5);
  });

});
