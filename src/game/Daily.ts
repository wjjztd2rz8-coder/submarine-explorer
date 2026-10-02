import {
  DAILY_MODIFIERS,
  DAILY_MODIFIER_LABELS,
  MODES_CONFIG,
  type DailyModifier,
} from '../core/config/modes.js';
import { mulberry32 } from '../world/life/rng.js';
import type { MissionDef } from './Mission.js';

export interface DailyDive {
  date: string;
  site: string;
  start: { x: number; z: number; headingDeg: number };
  variant: 'survey' | 'focus';
  modifier: DailyModifier;
}
export const utcDate = (date = new Date()): string => date.toISOString().slice(0, 10);
export function validDailyDate(date: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    utcDate(new Date(date)) === date
  );
}
function dateSeed(date: string): number {
  let h = 2166136261;
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Canonical daily site order, filtered by access. Input order never changes the dive. */
export function dailyDive(date: string, unlockedSites: readonly string[]): DailyDive | null {
  if (!validDailyDate(date)) return null;
  const sites = [...new Set(unlockedSites)].sort();
  if (!sites.length) return null;
  const rand = mulberry32(dateSeed(date));
  // Rank sites independently: unlocking one changes the pick only if it ranks ahead.
  // Approach, variant and water conditions remain the same for everyone today.
  const site = [...sites].sort(
    (a, b) => dateSeed(date + a) - dateSeed(date + b) || a.localeCompare(b),
  )[0];
  const radius = MODES_CONFIG.dailyStartRadiusM;
  return {
    date,
    site,
    start: {
      x: Math.round((rand() * 2 - 1) * radius),
      z: Math.round((rand() * 2 - 1) * radius),
      headingDeg: Math.floor(rand() * 360),
    },
    variant: rand() < 0.5 ? 'survey' : 'focus',
    modifier: DAILY_MODIFIERS[Math.floor(rand() * DAILY_MODIFIERS.length)],
  };
}
export function dailyRatingKey(dive: DailyDive): string {
  return `daily-${dive.date}`;
}

/** Retain authored goals; a focus dive selects one primary and one optional goal. */
export function dailyMission(def: MissionDef, dive: DailyDive): MissionDef {
  const out = structuredClone(def);
  if (dive.variant === 'focus') {
    const rand = mulberry32(dateSeed(dive.date + dive.site));
    const pick = (primary: boolean) => {
      const goals = out.objectives
        .filter((o) => o.primary === primary)
        .sort((a, b) => a.id.localeCompare(b.id));
      return goals.length ? [goals[Math.floor(rand() * goals.length)]] : [];
    };
    out.objectives = [...pick(true), ...pick(false)];
  }
  out.briefing.summary = `${DAILY_MODIFIER_LABELS[dive.modifier]}. ${out.briefing.summary}`;
  out.title = `Daily dive · ${out.title}`;
  return out;
}
