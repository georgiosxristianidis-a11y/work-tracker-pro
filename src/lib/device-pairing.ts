/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Entry } from './db';

export const PAIRING_QR_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

export interface PairingPayload {
  v: number;
  t: number;
  uid: string;
  at?: string;
  rt?: string;
  dev?: string;
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
  return Date.now() - payload.t > PAIRING_QR_TTL_MS;
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

/**
 * Encodes pairing data into a compact, URL-safe base64 string.
 */
export function encodePairingPayload(payload: PairingPayload): string {
  const jsonStr = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes and validates a pairing payload from an encoded string or URL.
 */
export function decodePairingPayload(raw: string): PairingPayload | null {
  try {
    let input = raw.trim();
    if (input.includes('pair=')) {
      const match = input.match(/[?&]pair=([^&#]+)/);
      if (match) {
        input = match[1];
      }
    }

    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(jsonStr) as Partial<PairingPayload>;

    if (
      parsed &&
      typeof parsed.v === 'number' &&
      typeof parsed.t === 'number' &&
      typeof parsed.uid === 'string' &&
      parsed.uid.length > 0
    ) {
      return parsed as PairingPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Builds the full pairing URL that can be scanned by any smartphone camera.
 */
export function buildPairingUrl(encodedPayload: string): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?pair=${encodeURIComponent(encodedPayload)}`;
}

/**
 * Merges local and remote entries safely using Last-Write-Wins (LWW) based on updated_at.
 */
export function mergeEntries(localEntries: Entry[], cloudEntries: Entry[]): MergeResult {
  const map = new Map<string, Entry>();
  let newFromCloud = 0;
  let newFromLocal = 0;

  for (const local of localEntries) {
    map.set(local.date, { ...local });
  }

  for (const cloud of cloudEntries) {
    const existing = map.get(cloud.date);

    if (!existing) {
      map.set(cloud.date, { ...cloud });
      newFromCloud++;
    } else {
      const localTime = existing.updated_at ?? 0;
      const cloudTime = cloud.updated_at ?? 0;

      if (cloudTime > localTime) {
        map.set(cloud.date, { ...cloud });
        newFromCloud++;
      } else if (localTime > cloudTime) {
        newFromLocal++;
      } else {
        if (existing.hours === 0 && cloud.hours > 0) {
          map.set(cloud.date, { ...cloud });
          newFromCloud++;
        }
      }
    }
  }

  const cloudDates = new Set(cloudEntries.map((e) => e.date));
  for (const local of localEntries) {
    if (!cloudDates.has(local.date)) {
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
