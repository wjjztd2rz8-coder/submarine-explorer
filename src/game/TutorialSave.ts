/**
 * Onboarding save (F3-ONBOARD): whether the first-dive tutorial is finished and
 * which hints were shown. Own key, so it never disturbs settings or discovery
 * migrations; a missing, old or malformed record means "new player".
 */

import type { SettingsStorage } from '../core/Save.js';
import { HINT_ORDER, type HintId } from './Hints.js';

export const ONBOARD_STORAGE_KEY = 'subexplorer.onboard.v1';
export const ONBOARD_VERSION = 1;

export interface OnboardRecord {
  version: 1;
  /** True once the tutorial was completed or skipped. */
  tutorialDone: boolean;
  seenHints: HintId[];
}

export function migrateOnboard(raw: unknown): OnboardRecord {
  const out: OnboardRecord = { version: 1, tutorialDone: false, seenHints: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const o = raw as Record<string, unknown>;
  if (o.version !== undefined && o.version !== 1) return out;
  out.tutorialDone = o.tutorialDone === true;
  if (Array.isArray(o.seenHints))
    out.seenHints = HINT_ORDER.filter((id) => (o.seenHints as unknown[]).includes(id));
  return out;
}

function safeStorage(): SettingsStorage | null {
  try {
    return (globalThis as { localStorage?: SettingsStorage }).localStorage ?? null;
  } catch {
    return null;
  }
}

export class TutorialSave {
  private data: OnboardRecord;
  private readonly readOnly: boolean;

  constructor(private readonly storage: SettingsStorage | null = safeStorage()) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(storage?.getItem(ONBOARD_STORAGE_KEY) ?? 'null');
    } catch {
      /* Session only. */
    }
    const version = (raw as { version?: unknown } | null)?.version;
    this.readOnly = typeof version === 'number' && version > ONBOARD_VERSION;
    this.data = migrateOnboard(raw);
  }

  get(): OnboardRecord {
    return { ...this.data, seenHints: [...this.data.seenHints] };
  }

  save(patch: Partial<Omit<OnboardRecord, 'version'>>): void {
    this.data = migrateOnboard({ ...this.data, ...patch });
    if (this.readOnly) return;
    try {
      this.storage?.setItem(ONBOARD_STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* Session only. */
    }
  }
}
