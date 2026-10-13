import { test, expect } from '@playwright/test';
import { SmartDocumentParser } from '../src/lib/smart-document-parser';
import { HistoricalGenerator } from '../src/lib/historical-generator';
import { CurrencyMath } from '../src/lib/currency-math';

test.describe('Smart Import & Multi-Year Historical Sync (#devil)', () => {

  test('1. SmartDocumentParser: parses JSON, Markdown and Plain Text offline', async () => {
    // 1.1 JSON parsing
    const jsonSample = JSON.stringify([
      { date: '2024-03-01', hours: 8, category: 'Core' },
      { date: '2024-03-02', hours: 7.5, category: 'Direct Clients' },
      { date: '2024-03-03', hours: 4, category: 'Consulting' }
    ]);
    const jsonRes = SmartDocumentParser.parseJSON(jsonSample);
    expect(jsonRes.records.length).toBe(3);
    expect(jsonRes.totalHours).toBe(19.5);
    expect(jsonRes.detectedFormat).toBe('json');
    expect(jsonRes.records[0].category).toBe('core');
    expect(jsonRes.records[1].category).toBe('clients');

    // 1.2 Markdown table parsing
    const mdSample = `
# Timesheet
| Date | Hours | Category | Notes |
|---|---|---|---|
| 2024-04-10 | 8.0 | Core Project | Sprint Alpha |
| 2024-04-11 | 9.0 | Retainer | Monthly ops |
`;
    const mdRes = SmartDocumentParser.parseMarkdown(mdSample);
    expect(mdRes.records.length).toBe(2);
    expect(mdRes.totalHours).toBe(17);
    expect(mdRes.records[0].category).toBe('core');
    expect(mdRes.records[1].category).toBe('retainer');

    // 1.3 Plain text / CSV parsing
    const csvSample = `
2024-05-01, 8, Core
2024-05-02, 6.5, Consulting
`;
    const txtRes = SmartDocumentParser.parsePlainText(csvSample);
    expect(txtRes.records.length).toBe(2);
    expect(txtRes.totalHours).toBe(14.5);
  });

  test('2. HistoricalGenerator: 3-year and 5-year exact mathematical allocations', async () => {
    // 2.1 3-Year generation
    const gen3 = HistoricalGenerator.generateHistory(3, 25, 'balanced');
    expect(gen3.years).toBe(3);
    expect(gen3.entries.length).toBeGreaterThan(600);
    expect(gen3.totalHours).toBeGreaterThan(4000);
    expect(gen3.totalEarned).toBe(gen3.totalHours * 25);

    // Verify exact BigInt sum equality for categories
    const coreScaled = BigInt(gen3.categoryTotals.coreScaled);
    const clientsScaled = BigInt(gen3.categoryTotals.clientsScaled);
    const retainerScaled = BigInt(gen3.categoryTotals.retainerScaled);
    const consultingScaled = BigInt(gen3.categoryTotals.consultingScaled);
    const totalCategoriesScaled = coreScaled + clientsScaled + retainerScaled + consultingScaled;

    const expectedTotalScaled = CurrencyMath.toScaled(gen3.totalEarned);
    expect(totalCategoriesScaled).toBe(expectedTotalScaled);

    // 2.2 5-Year generation
    const gen5 = HistoricalGenerator.generateHistory(5, 30, 'intensive');
    expect(gen5.years).toBe(5);
    expect(gen5.entries.length).toBeGreaterThan(1000);
    expect(gen5.totalHours).toBeGreaterThan(7000);
    expect(gen5.totalEarned).toBe(gen5.totalHours * 30);
  });

  test('3. UI: Navigates to Financial Dashboard and opens Smart Import modal', async ({ page }) => {
    await page.goto('/');

    // Navigate to Settings
    const navButtons = page.locator('nav button');
    await navButtons.nth(3).click();

    // Click "Financial Dashboard (Offline)"
    const financeBtn = page.locator('button:has-text("Financial Dashboard (Offline)")').first();
    await expect(financeBtn).toBeVisible();
    await financeBtn.click();

    // Verify Financial Dashboard view is open
    await expect(page.locator('text=Overall Balance').first()).toBeVisible();

    // Click Smart Import trigger in header
    const importBtn = page.locator('button[aria-label="Smart import and multi-year fill"]').first();
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Verify Smart Import modal opened
    await expect(page.locator('h3:has-text("Smart Import & Multi-Year Sync")')).toBeVisible();
    await expect(page.locator('text=100% Offline • Zero Network Traffic')).toBeVisible();

    // Switch to 3-5 Year tab
    const multiYearTab = page.locator('button:has-text("3–5 Year Smart Fill")').first();
    await multiYearTab.click();

    // Verify 3 Years and 5 Years options are present
    await expect(page.locator('button:has-text("2023 – 2026")')).toBeVisible();
    await expect(page.locator('button:has-text("2021 – 2026")')).toBeVisible();
    await expect(page.locator('button:has-text("Generate & Sync")')).toBeVisible();
  });
});
