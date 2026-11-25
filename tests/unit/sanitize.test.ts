import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEntries, shiftMonth, parseBackupPayload } from '../../src/lib/utils.ts';

test('sanitizeEntries - keeps valid rows unchanged', () => {
  const rows = [{ date: '2026-10-05', hours: 7.5, month: '2026-10' }];
  assert.deepEqual(sanitizeEntries(rows), rows);
});

test('sanitizeEntries - drops rows without string date', () => {
  const rows = [null, undefined, 42, 'x', {}, { date: 123, hours: 8 }, { date: '2026-10-05', hours: 8 }];
  assert.deepEqual(sanitizeEntries(rows), [{ date: '2026-10-05', hours: 8, month: '2026-10' }]);
});

test('sanitizeEntries - non-numeric hours fall back to 0', () => {
  const rows = [
    { date: '2026-10-01', hours: 'cat' },
    { date: '2026-10-02' },
    { date: '2026-10-03', hours: null },
    { date: '2026-10-04', hours: NaN }
  ];
  assert.deepEqual(sanitizeEntries(rows).map(e => e.hours), [0, 0, 0, 0]);
});

test('sanitizeEntries - numeric string hours are parsed', () => {
  assert.equal(sanitizeEntries([{ date: '2026-10-01', hours: '7.5' }])[0].hours, 7.5);
});

test('sanitizeEntries - month is derived from date when missing or empty', () => {
  const rows = [{ date: '2026-09-30', hours: 1 }, { date: '2026-08-15', hours: 1, month: '' }];
  assert.deepEqual(sanitizeEntries(rows).map(e => e.month), ['2026-09', '2026-08']);
});

test('sanitizeEntries - non-array input gives empty list', () => {
  assert.deepEqual(sanitizeEntries(null), []);
  assert.deepEqual(sanitizeEntries(undefined), []);
  assert.deepEqual(sanitizeEntries([]), []);
});

test('sanitizeEntries - preserves valid updated_at and normalizes ISO strings', () => {
  const rows = [
    { date: '2026-10-05', hours: 8, month: '2026-10', updated_at: 1760000000000 },
    { date: '2026-10-06', hours: 6, month: '2026-10', updated_at: '2026-10-06T12:00:00.000Z' },
    { date: '2026-10-07', hours: 4, month: '2026-10', updated_at: 'invalid-ts' },
  ];
  const res = sanitizeEntries(rows);
  assert.equal(res[0].updated_at, 1760000000000);
  assert.equal(res[1].updated_at, Date.parse('2026-10-06T12:00:00.000Z'));
  assert.equal(res[2].updated_at, undefined);
});

test('shiftMonth - avoids 29th-31st day overflow when navigating to shorter months', () => {
  const mar31 = new Date(2026, 2, 31, 15, 30);
  const prevFromMar31 = shiftMonth(mar31, -1);
  assert.equal(prevFromMar31.getFullYear(), 2026);
  assert.equal(prevFromMar31.getMonth(), 1);
  assert.equal(prevFromMar31.getDate(), 1);

  const jan31 = new Date(2026, 0, 31);
  const nextFromJan31 = shiftMonth(jan31, 1);
  assert.equal(nextFromJan31.getFullYear(), 2026);
  assert.equal(nextFromJan31.getMonth(), 1);
  assert.equal(nextFromJan31.getDate(), 1);

  const jan1 = new Date(2026, 0, 15);
  const decPrevYear = shiftMonth(jan1, -1);
  assert.equal(decPrevYear.getFullYear(), 2025);
  assert.equal(decPrevYear.getMonth(), 11);
});

test('parseBackupPayload - accepts v1 and legacy backups, strips bad fields, rejects future versions', () => {
  const v1 = parseBackupPayload(JSON.stringify({
    version: 1,
    entries: [{ date: '2026-11-10', hours: 8, updated_at: 1700000000000 }, { date: 'bad', hours: 99 }],
    settings: { rate: 25, currency: 'EUR', theme: 'indigo', injectedFn: 'ignored' }
  }));
  assert.ok(v1);
  assert.equal(v1.entries.length, 1);
  assert.equal(v1.entries[0].updated_at, 1700000000000);
  assert.deepEqual(v1.settings, { rate: 25, currency: 'EUR', theme: 'indigo' });

  const legacy = parseBackupPayload(JSON.stringify({ entries: [{ date: '2026-11-11', hours: 6 }] }));
  assert.equal(legacy?.entries.length, 1);

  assert.equal(parseBackupPayload(JSON.stringify({ version: 2, entries: [] })), null);
  assert.equal(parseBackupPayload('not-json'), null);
});
