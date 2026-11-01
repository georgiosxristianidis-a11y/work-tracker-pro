import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeEntries } from '../../src/lib/utils.ts';

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
