import type { GameplayOptions } from './gameplay.js';

/** Scale the archived current field and local flow without changing its direction. */
export const MODES_CONFIG = { dailyCurrentScale: 8, dailyStartRadiusM: 35 } as const;
export const DAILY_MODIFIERS = ['calm', 'strong-currents', 'low-light'] as const;
export type DailyModifier = (typeof DAILY_MODIFIERS)[number];
export const DAILY_MODIFIER_LABELS: Record<DailyModifier, string> = {
  calm: 'Calm water',
  'strong-currents': 'Strong currents',
  'low-light': 'Low light',
};

export type CurrentMode = 'off' | 'realistic' | 'strong';
export function currentScale(mode: CurrentMode): number {
  return mode === 'off' ? 0 : mode === 'strong' ? MODES_CONFIG.dailyCurrentScale : 1;
}
export const GAMEPLAY_LABELS: Record<keyof GameplayOptions, string> = {
  batteryOxygen: 'Battery and oxygen',
  currents: 'Currents',
  visualHints: 'Visual waypoints',
  startPosition: 'Start at surface',
};
export const GAMEPLAY_ORDER: ReadonlyArray<keyof GameplayOptions> = [
  'batteryOxygen',
  'currents',
  'visualHints',
  'startPosition',
];
export const GAMEPLAY_NOTES: Partial<Record<keyof GameplayOptions, string>> = {
  visualHints: 'Marker, edge arrow and in-range cue for objectives in the dive view.',
};
export function gameplayKeysInOrder(options: object): Array<keyof GameplayOptions> {
  return GAMEPLAY_ORDER.filter((key) => Object.hasOwn(options, key));
}
