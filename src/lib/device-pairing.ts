/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fromWorkEntryRow, parseEntryTimestamp, type Entry, type RawCloudEntryRow } from './db.ts';

export const PAIRING_QR_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

export interface PairingPayload {
  v: number;
  t: number;
  uid: string;
  code?: string;
  dev?: string;
  entries?: Array<{ date: string; hours: number; updated_at?: number }>;
}

export interface MergeResult {
  merged: Entry[];
  newFromCloud: number;
  newFromLocal: number;
}

/**
 * Checks whether a pairing payload has exceeded its 10-minute lifespan.
 */
export function isPairingPayloadExpired(payload: PairingPayload): boolean {
  const delta = Date.now() - payload.t;
  return !Number.isFinite(delta) || delta > PAIRING_QR_TTL_MS || delta < -60_000;
}

/**
 * Returns remaining seconds before expiration (0 if already expired).
 */
export function getPairingRemainingSeconds(createdAt: number): number {
  const elapsed = Date.now() - createdAt;
  return Math.max(0, Math.floor((PAIRING_QR_TTL_MS - elapsed) / 1000));
}

/**
 * Formats seconds into mm:ss display string.
 */
export function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const MAX_DECOMPRESSED_QR_BYTES = 65_536;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(input: string): Uint8Array {
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function extractPairParam(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes('pair=')) {
    const match = trimmed.match(/[?&#]pair=([^&#]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return trimmed;
}

function validateParsedPayload(parsed: Partial<PairingPayload> | null, raw: string): PairingPayload | null {
  if (
    parsed &&
    parsed.v === 1 &&
    typeof parsed.t === 'number' && Number.isFinite(parsed.t) && parsed.t > 0 &&
    typeof parsed.uid === 'string' && parsed.uid.trim().length > 0 && parsed.uid.length <= 128
  ) {
    if (parsed.entries !== undefined) {
      if (!Array.isArray(parsed.entries)) return null;
      const valid = parsed.entries.slice(0, 64).filter((e) =>
        Boolean(e && typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
        typeof e.hours === 'number' && Number.isFinite(e.hours) && e.hours > 0 && e.hours <= 24)
      );
      if (parsed.entries.length > 0 && valid.length === 0) return null;
      parsed.entries = valid;
    }
    if (!parsed.code && raw.includes('code=')) {
      const codeMatch = raw.match(/[?&#]code=([^&#]+)/);
      if (codeMatch) {
        parsed.code = decodeURIComponent(codeMatch[1]);
      }
    }
    return parsed as PairingPayload;
  }
  return null;
}

/**
 * Encodes pairing data into a compact, URL-safe base64 string.
 */
export function encodePairingPayload(payload: PairingPayload): string {
  const jsonStr = JSON.stringify(payload);
  return bytesToBase64Url(new TextEncoder().encode(jsonStr));
}

/**
 * Compresses pairing payload with deflate-raw (z.<base64url>) so up to 60 shifts fit comfortably in a QR code.
 */
export async function encodePairingPayloadAsync(payload: PairingPayload): Promise<string> {
  const rawBytes = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(rawBytes);
      writer.close();
      const buf = await new Response(cs.readable).arrayBuffer();
      return `z.${bytesToBase64Url(new Uint8Array(buf))}`;
    } catch {
      // Fallback to uncompressed base64url
    }
  }
  return bytesToBase64Url(rawBytes);
}

/**
 * Decodes and validates an uncompressed pairing payload from an encoded string or URL (#pair= / ?pair=).
 */
export function decodePairingPayload(raw: string): PairingPayload | null {
  try {
    const input = extractPairParam(raw);
    if (!input || input.startsWith('z.')) return null;
    const jsonStr = new TextDecoder().decode(base64UrlToBytes(input));
    const parsed = JSON.parse(jsonStr) as Partial<PairingPayload>;
    return validateParsedPayload(parsed, raw);
  } catch {
    return null;
  }
}

/**
 * Decodes both deflate-raw compressed (z.<base64url>) and legacy base64url pairing payloads with a 64 KB cap.
 */
export async function decodePairingPayloadAsync(raw: string): Promise<PairingPayload | null> {
  try {
    const input = extractPairParam(raw);
    if (!input) return null;
    if (!input.startsWith('z.')) return decodePairingPayload(raw);
    if (typeof DecompressionStream === 'undefined') return null;

    const compressed = base64UrlToBytes(input.slice(2));
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressed).catch(() => {});
    writer.close().catch(() => {});

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_DECOMPRESSED_QR_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.byteLength;
    }
    const parsed = JSON.parse(new TextDecoder().decode(merged)) as Partial<PairingPayload>;
    return validateParsedPayload(parsed, raw);
  } catch {
    return null;
  }
}

/**
 * Generates an 8-character CSPRNG pairing code (e.g. "6Q9E-VUBT") without modulo bias.
 */
export function generatePairingCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 unambiguous chars (31 * 8 = 248)
  const out: string[] = [];
  const buf = new Uint8Array(16);
  while (out.length < 8) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.length && out.length < 8; i++) {
      if (buf[i] < 248) out.push(chars.charAt(buf[i] % 31));
    }
  }
  return `${out.slice(0, 4).join('')}-${out.slice(4, 8).join('')}`;
}

/**
 * Normalizes user-typed pairing code by trimming, uppercasing, and standardizing hyphenation.
 */
export function normalizePairingCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

/**
 * Builds the full pairing URL using a client-only URL fragment (#pair=) so payloads never leak in HTTP access logs.
 */
export function buildPairingUrl(encodedPayload: string, code?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const codeParam = code ? `&code=${encodeURIComponent(code)}` : '';

  const isLocal = !origin || origin.includes('localhost') || origin.includes('127.0.0.1');
  const envOrigin = (import.meta as { env?: { VITE_APP_ORIGIN?: string } }).env?.VITE_APP_ORIGIN;
  const baseOrigin = isLocal ? (envOrigin || 'https://work-tracker-pro-kohl.vercel.app') : origin;

  return `${baseOrigin}${pathname}#pair=${encodeURIComponent(encodedPayload)}${codeParam}`;
}

/**
 * Merges local and remote entries safely using Safe Union (Zero Local Deletion).
 * Local positive entries are NEVER wiped out. Remote positive entries are added.
 * In case of conflicting hours on the same date, the newest positive entry is preferred.
 */
export function mergeEntries(localEntries: Entry[], cloudEntries: Entry[]): MergeResult {
  const map = new Map<string, Entry>();
  let newFromCloud = 0;
  let newFromLocal = 0;

  // 1. Seed with all local positive entries (The Vault: local data is sacred)
  for (const local of localEntries) {
    if (local.hours > 0) {
      map.set(local.date, { ...local });
    }
  }

  // 2. Safely merge cloud / remote entries
  for (const cloud of cloudEntries) {
    if (cloud.hours <= 0) continue; // Remote zero-hours can never overwrite local entries (Safe Union)

    const existing = map.get(cloud.date);

    if (!existing) {
      // New remote entry added to local set
      map.set(cloud.date, { ...cloud });
      newFromCloud++;
    } else {
      const localTime = parseEntryTimestamp(existing.updated_at) ?? 0;
      const cloudTime = parseEntryTimestamp(cloud.updated_at) ?? 0;

      if (cloudTime > localTime) {
        // Remote is newer and has positive hours: update to newest hours
        map.set(cloud.date, { ...cloud });
        newFromCloud++;
      } else if (localTime > cloudTime) {
        newFromLocal++;
      }
    }
  }

  const cloudDates = new Set(cloudEntries.filter((e) => e.hours > 0).map((e) => e.date));
  for (const local of localEntries) {
    if (local.hours > 0 && !cloudDates.has(local.date)) {
      newFromLocal++;
    }
  }

  const merged = Array.from(map.values())
    .filter((e) => e.hours > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    merged,
    newFromCloud,
    newFromLocal
  };
}

export interface CloudReconcilePlan {
  entriesToSaveLocally: Entry[];
  datesToDeleteLocally: string[];
  entriesToUpload: Entry[];
  clearDeletedAtDates: Set<string>;
  tombstonesToUpload: Array<{ date: string; deletedAtMs: number }>;
}

/**
 * Bidirectional causal LWW reconciliation between local IndexedDB entries,
 * queued local deletions, and remote Supabase rows (including deleted_at tombstones).
 */
export function reconcileCloudEntries(
  localEntries: Entry[],
  localPendingDeletes: Record<string, number>,
  cloudRows: RawCloudEntryRow[]
): CloudReconcilePlan {
  const localMap = new Map<string, Entry>();
  for (const e of localEntries) {
    if (e.hours > 0) localMap.set(e.date, e);
  }

  const cloudMap = new Map<string, RawCloudEntryRow>();
  for (const r of cloudRows) {
    if (r && typeof r.date === 'string') cloudMap.set(r.date, r);
  }

  const allDates = new Set<string>([
    ...localMap.keys(),
    ...Object.keys(localPendingDeletes),
    ...cloudMap.keys()
  ]);

  const entriesToSaveLocally: Entry[] = [];
  const datesToDeleteLocally: string[] = [];
  const entriesToUpload: Entry[] = [];
  const clearDeletedAtDates = new Set<string>();
  const tombstonesToUpload: Array<{ date: string; deletedAtMs: number }> = [];

  for (const date of allDates) {
    const local = localMap.get(date);
    const localTime = local ? (parseEntryTimestamp(local.updated_at) ?? 0) : -1;
    const rawPendingDel = parseEntryTimestamp(localPendingDeletes[date]);
    const pendingDelTime = rawPendingDel !== undefined && (!local || rawPendingDel > localTime)
      ? rawPendingDel
      : -1;

    const cloud = cloudMap.get(date);
    const isCloudTombstone = Boolean(
      cloud && (cloud.deleted_at !== null && cloud.deleted_at !== undefined || Number(cloud.hours) <= 0)
    );
    const cloudDelTime = cloud && isCloudTombstone
      ? (parseEntryTimestamp(cloud.deleted_at) ?? parseEntryTimestamp(cloud.updated_at) ?? 0)
      : -1;
    const cloudActive = cloud && !isCloudTombstone ? fromWorkEntryRow(cloud) : null;
    const cloudTime = cloudActive ? (cloudActive.updated_at ?? 0) : -1;

    if (pendingDelTime >= 0) {
      if (cloudActive && cloudTime > pendingDelTime) {
        entriesToSaveLocally.push(cloudActive);
      } else if (!cloud || !isCloudTombstone || pendingDelTime > cloudDelTime) {
        tombstonesToUpload.push({ date, deletedAtMs: pendingDelTime });
      }
      continue;
    }

    if (local) {
      if (isCloudTombstone) {
        if (cloudDelTime >= localTime) {
          datesToDeleteLocally.push(date);
        } else {
          entriesToUpload.push(local);
          clearDeletedAtDates.add(date);
        }
      } else if (cloudActive) {
        if (cloudTime > localTime && cloudActive.hours !== local.hours) {
          entriesToSaveLocally.push(cloudActive);
        } else if (localTime > cloudTime || cloudActive.hours !== local.hours) {
          entriesToUpload.push(local);
        }
      } else {
        entriesToUpload.push(local);
      }
      continue;
    }

    if (cloudActive) {
      entriesToSaveLocally.push(cloudActive);
    }
  }

  return {
    entriesToSaveLocally,
    datesToDeleteLocally,
    entriesToUpload,
    clearDeletedAtDates,
    tombstonesToUpload
  };
}
