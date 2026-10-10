/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Entry } from './db';

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
 * Merges local and remote entries safely without losing valid recorded hours.
 */
export function mergeEntries(localEntries: Entry[], cloudEntries: Entry[]): MergeResult {
  const map = new Map<string, Entry>();
  let newFromCloud = 0;
  let newFromLocal = 0;

  for (const item of localEntries) {
    map.set(item.date, { ...item });
  }

  for (const item of cloudEntries) {
    const existing = map.get(item.date);
    if (!existing) {
      map.set(item.date, { ...item });
      newFromCloud++;
    } else if (existing.hours === 0 && item.hours > 0) {
      map.set(item.date, { ...item });
      newFromCloud++;
    }
  }

  const cloudDates = new Set(cloudEntries.map((e) => e.date));
  for (const item of localEntries) {
    if (!cloudDates.has(item.date)) {
      newFromLocal++;
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  return {
    merged,
    newFromCloud,
    newFromLocal
  };
}
