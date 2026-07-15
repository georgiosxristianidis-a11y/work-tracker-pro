/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DOW_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const MONTH_NAMES_RUS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const MONTH_NAMES_GR = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

export interface AppSettings {
  currency: 'EUR' | 'RUB';
  language: 'ENG' | 'RUS' | 'GR';
  rate: number;
  overtime: number;
  normal: number;
  goal: number;
  bonus: number;
  deduction: number;
  privacyMode: boolean;
  strictOfflineMode: boolean;
  /** @deprecated no longer surfaced in UI; kept for settings migration */
  e2eeEnabled: boolean;
  /** @deprecated no longer surfaced in UI; kept for settings migration */
  e2eeKey: string;
  theme: 'light' | 'dark' | 'indigo';
  hapticEnabled: boolean;
  developerMode?: boolean;
  sortOldestFirst?: boolean;
  powerSaveMode?: boolean;
  notificationsEnabled?: boolean;
  lastSync?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'EUR',
  language: 'ENG',
  rate: 15,
  overtime: 1.5,
  normal: 10,
  goal: 2700,
  bonus: 0,
  deduction: 0,
  privacyMode: false,
  strictOfflineMode: false,
  e2eeEnabled: false,
  e2eeKey: '',
  theme: 'light',
  hapticEnabled: true,
  developerMode: false,
  sortOldestFirst: false,
  powerSaveMode: false,
  notificationsEnabled: true
};
