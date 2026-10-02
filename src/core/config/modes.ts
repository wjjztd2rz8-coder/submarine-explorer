import type { GameplayOptions, CurrentsConfig } from './gameplay.js';

/** Scale the archived current field and local flow without changing its direction. */
export const MODES_CONFIG = { exaggeratedCurrentScale: 8, dailyStartRadiusM: 35 } as const;
export const DAILY_MODIFIERS = ['calm', 'strong-currents', 'low-light'] as const;
export type DailyModifier = (typeof DAILY_MODIFIERS)[number];
export const DAILY_MODIFIER_LABELS: Record<DailyModifier, string> = {
  calm: 'Calm water',
  'strong-currents': 'Strong currents',
  'low-light': 'Low light',
};

/** Gentle stays readable in old saves but is no longer offered for new choices. */
export const CURRENT_CHOICES = ['off', 'realistic', 'exaggerated'] as const;
export function currentScale(
  mode: GameplayOptions['currents'],
  config: Pick<CurrentsConfig, 'gentleScale'>,
): number {
  if (mode === 'off') return 0;
  if (mode === 'gentle') return config.gentleScale;
  return mode === 'exaggerated' ? MODES_CONFIG.exaggeratedCurrentScale : 1;
}

export const GAMEPLAY_LABELS: Record<keyof GameplayOptions, string> = {
  speedProfile: 'Forward speed',
  lights: 'Lights',
  sensors: 'Sensors',
  visualHints: 'Visual waypoints',
  sonarMarkers: 'Sonar markers',
  startPosition: 'Start position',
  batteryOxygen: 'Battery and oxygen',
  currents: 'Currents',
  descentProfile: 'Descent speed',
  simSpeed: 'Simulation speed',
};
export const GAMEPLAY_ORDER: ReadonlyArray<keyof GameplayOptions> = [
  'speedProfile',
  'descentProfile',
  'lights',
  'sensors',
  'visualHints',
  'sonarMarkers',
  'batteryOxygen',
  'currents',
  'startPosition',
  'simSpeed',
];
export const GAMEPLAY_NOTES: Partial<Record<keyof GameplayOptions, string>> = {
  speedProfile: 'Research is about 1 m/s, like Alvin. Fast is a game speed for any hull.',
  descentProfile: "Research is about 0.5 m/s, like Alvin's descent. Fast is a game speed.",
  visualHints: 'Marker, edge arrow and in-range cue for objectives in the dive view.',
  sonarMarkers: 'Objective and discovery icons on the sonar map. The seabed always shows.',
};
export function gameplayKeysInOrder(options: object): Array<keyof GameplayOptions> {
  const keys = Object.keys(options) as Array<keyof GameplayOptions>;
  return [
    ...GAMEPLAY_ORDER.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !GAMEPLAY_ORDER.includes(k)),
  ];
}
