import type { SettingsStorage } from '../core/Save.js';
import { validDailyDate } from './Daily.js';

export const DAILY_STORAGE_KEY = 'subexplorer.daily.v1';
export interface DailyRecord {
  version: 1;
  lastCompletedDate: string | null;
  streak: number;
}
const empty = (): DailyRecord => ({ version: 1, lastCompletedDate: null, streak: 0 });
const day = (date: string): number => Date.parse(date) / 86_400_000;

/** Completing again today is idempotent; older dates never advance a streak. */
export function completeDaily(record: DailyRecord, date: string): DailyRecord {
  if (!validDailyDate(date) || (record.lastCompletedDate && date <= record.lastCompletedDate))
    return { ...record };
  return {
    version: 1,
    lastCompletedDate: date,
    streak:
      record.lastCompletedDate && day(date) - day(record.lastCompletedDate) === 1
        ? record.streak + 1
        : 1,
  };
}
export function dailyStreak(record: DailyRecord, today: string): number {
  return record.lastCompletedDate &&
    day(today) - day(record.lastCompletedDate) <= 1 &&
    today >= record.lastCompletedDate
    ? record.streak
    : 0;
}
export class DailySave {
  private data = empty();
  private storage: SettingsStorage | null;
  private protectedVersion = false;
  constructor(storage?: SettingsStorage | null) {
    try {
      this.storage = storage === undefined ? localStorage : storage;
    } catch {
      this.storage = null;
    }
    try {
      const raw: unknown = JSON.parse(this.storage?.getItem(DAILY_STORAGE_KEY) ?? 'null');
      if (!raw || typeof raw !== 'object') return;
      const value = raw as Record<string, unknown>;
      this.protectedVersion = typeof value.version === 'number' && value.version > 1;
      if (
        value.version === 1 &&
        typeof value.lastCompletedDate === 'string' &&
        validDailyDate(value.lastCompletedDate) &&
        Number.isSafeInteger(value.streak) &&
        Number(value.streak) > 0
      ) {
        this.data = {
          version: 1,
          lastCompletedDate: value.lastCompletedDate,
          streak: Number(value.streak),
        };
      }
    } catch {
      /* unavailable or malformed storage uses session defaults */
    }
  }
  get(): DailyRecord {
    return { ...this.data };
  }
  complete(date: string): void {
    this.data = completeDaily(this.data, date);
    if (this.protectedVersion) return;
    try {
      this.storage?.setItem(DAILY_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* session only */
    }
  }
}
