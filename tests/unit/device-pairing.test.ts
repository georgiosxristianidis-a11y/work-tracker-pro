import test from 'node:test';
import assert from 'node:assert/strict';
import {
  encodePairingPayload,
  decodePairingPayload,
  isPairingPayloadExpired,
  generatePairingCode,
  normalizePairingCode,
  mergeEntries
} from '../../src/lib/device-pairing.ts';
import type { PairingPayload } from '../../src/lib/device-pairing.ts';
import {
  parseEntryTimestamp,
  formatSupabaseTimestamp,
  toWorkEntryRow,
  fromWorkEntryRow,
  type Entry
} from '../../src/lib/db.ts';

test('device-pairing - payload encoding and decoding round-trip', () => {
  const payload: PairingPayload = {
    v: 1,
    t: 1700000000000,
    uid: 'user-xyz-123',
    code: 'TEST-CODE',
    dev: 'device-abc'
  };

  const encoded = encodePairingPayload(payload);
  assert.ok(typeof encoded === 'string');
  assert.ok(encoded.length > 0);

  const decoded = decodePairingPayload(encoded);
  assert.deepEqual(decoded, payload);
});

test('device-pairing - decode accepts raw URL with query param', () => {
  const payload: PairingPayload = {
    v: 1,
    t: 1700000000000,
    uid: 'user-456',
    code: 'ABCD-EFGH'
  };
  const encoded = encodePairingPayload(payload);
  const fullUrl = `https://worktracker.app/?pair=${encoded}&code=ABCD-EFGH`;

  const decoded = decodePairingPayload(fullUrl);
  assert.ok(decoded !== null);
  assert.equal(decoded?.uid, 'user-456');
  assert.equal(decoded?.code, 'ABCD-EFGH');
});

test('device-pairing - decode rejects invalid schema, version, and poisoned entries', () => {
  assert.equal(decodePairingPayload('invalid-base64-???'), null);
  assert.equal(decodePairingPayload(''), null);
  assert.equal(decodePairingPayload(encodePairingPayload({ v: 2, t: Date.now(), uid: 'u1' })), null);
  assert.equal(decodePairingPayload(encodePairingPayload({ v: 1, t: Date.now(), uid: '   ' })), null);
  assert.equal(
    decodePairingPayload(encodePairingPayload({ v: 1, t: Date.now(), uid: 'u1', entries: [{ date: 'bad', hours: -5 }] })),
    null
  );
  const mixed = decodePairingPayload(
    encodePairingPayload({
      v: 1,
      t: Date.now(),
      uid: 'u1',
      entries: [
        { date: '2026-11-01', hours: 8 },
        { date: 'bad-date', hours: 8 },
        { date: '2026-11-02', hours: 99 }
      ]
    })
  );
  assert.equal(mixed?.entries?.length, 1);
  assert.equal(mixed?.entries?.[0]?.date, '2026-11-01');
});

test('device-pairing - expiration check rejects stale, future, and NaN timestamps', () => {
  const recent: PairingPayload = { v: 1, t: Date.now() - 1000, uid: 'u1' };
  assert.equal(isPairingPayloadExpired(recent), false);

  const expired: PairingPayload = { v: 1, t: Date.now() - (11 * 60 * 1000), uid: 'u1' };
  assert.equal(isPairingPayloadExpired(expired), true);
  assert.equal(isPairingPayloadExpired({ v: 1, t: Date.now() + 120_000, uid: 'u1' }), true);
  assert.equal(isPairingPayloadExpired({ v: 1, t: Number.NaN, uid: 'u1' }), true);
});

test('device-pairing - pairing code normalization', () => {
  assert.equal(normalizePairingCode('abcd efgh'), 'ABCD-EFGH');
  assert.equal(normalizePairingCode('abcd-efgh'), 'ABCD-EFGH');
  assert.equal(normalizePairingCode('1234'), '1234');
});

test('device-pairing - pairing code generation format', () => {
  const code = generatePairingCode();
  assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
});

test('device-pairing - mergeEntries safe union without deleting local records', () => {
  const local: Entry[] = [
    { date: '2026-11-01', hours: 8, month: '2026-11', updated_at: 1000 },
    { date: '2026-11-02', hours: 6, month: '2026-11', updated_at: 1000 }
  ];

  const cloud: Entry[] = [
    // Older entry for 2026-11-01 (should NOT overwrite newer local)
    { date: '2026-11-01', hours: 4, month: '2026-11', updated_at: 500 },
    // Newer entry for 2026-11-02 (SHOULD overwrite older local)
    { date: '2026-11-02', hours: 7.5, month: '2026-11', updated_at: 2000 },
    // Completely new entry from remote
    { date: '2026-11-03', hours: 8, month: '2026-11', updated_at: 1500 }
  ];

  const result = mergeEntries(local, cloud);

  assert.equal(result.merged.length, 3);
  assert.equal(result.newFromCloud, 2); // 2026-11-02 updated, 2026-11-03 added
  assert.equal(result.newFromLocal, 1); // 2026-11-01 kept local

  const day1 = result.merged.find(e => e.date === '2026-11-01');
  const day2 = result.merged.find(e => e.date === '2026-11-02');
  const day3 = result.merged.find(e => e.date === '2026-11-03');

  assert.equal(day1?.hours, 8);
  assert.equal(day2?.hours, 7.5);
  assert.equal(day3?.hours, 8);
});

test('db timestamps - formats epoch ms to ISO timestamptz and parses Supabase rows without NaN', () => {
  const sampleMs = 1794850145045;
  const iso = '2026-11-16T17:29:05.045Z';

  assert.equal(parseEntryTimestamp(sampleMs), sampleMs);
  assert.equal(parseEntryTimestamp(String(sampleMs)), sampleMs);
  assert.equal(parseEntryTimestamp(iso), sampleMs);
  assert.equal(parseEntryTimestamp('2026-11-16T17:29:05.045+00:00'), sampleMs);
  assert.equal(parseEntryTimestamp(Number.NaN), undefined);
  assert.equal(parseEntryTimestamp('not-a-timestamp'), undefined);
  assert.equal(parseEntryTimestamp(''), undefined);

  assert.equal(formatSupabaseTimestamp(sampleMs), iso);
  assert.equal(formatSupabaseTimestamp(Number.NaN, sampleMs), iso);

  const localWithExtra = {
    date: '2026-11-16',
    hours: 8,
    month: '2026-11',
    updated_at: sampleMs,
    extraField: 'should-not-leak'
  } as Entry;
  const row = toWorkEntryRow(localWithExtra, 'user-1', 'dev-1');
  assert.deepEqual(row, {
    user_id: 'user-1',
    date: '2026-11-16',
    hours: 8,
    month: '2026-11',
    device_id: 'dev-1',
    updated_at: iso
  });

  const restored = fromWorkEntryRow({
    date: '2026-11-16',
    hours: '8.5',
    month: '2026-11',
    updated_at: '2026-11-16T17:29:05.045+00:00'
  });
  assert.deepEqual(restored, {
    date: '2026-11-16',
    hours: 8.5,
    month: '2026-11',
    updated_at: sampleMs
  });
});

test('device-pairing - mergeEntries recovers cleanly when local updated_at is NaN', () => {
  const local: Entry[] = [
    { date: '2026-11-16', hours: 4, month: '2026-11', updated_at: Number.NaN }
  ];
  const cloud: Entry[] = [
    { date: '2026-11-16', hours: 9, month: '2026-11', updated_at: 1794850145045 }
  ];

  const result = mergeEntries(local, cloud);
  assert.equal(result.merged.length, 1);
  assert.equal(result.merged[0]?.hours, 9);
  assert.equal(result.newFromCloud, 1);
});
