/**
 * Game mode segmented control (D2-PREDIVE, playtest #3): Arcade / Realistic /
 * Custom as three radio segments with a one-line description of the current
 * mode. The same control appears on the home screen, in the briefing's Dive
 * settings and at the top of Settings > Gameplay; each instance reads and
 * writes the one `gameplayMode` setting through {@link Save}.
 *
 * Native radios keep keyboard behaviour for free: Tab reaches the group,
 * arrow keys move between modes (and apply them, as radios do).
 */

import type { GameplayOptions } from '../core/Config.js';
import type { GameplayMode, SettingsData } from '../core/Save.js';

export const GAME_MODES: ReadonlyArray<{ id: GameplayMode; label: string; description: string }> = [
  {
    id: 'arcade',
    label: 'Arcade',
    description:
      'Fast travel, strong lights, long-range sensors and waypoints. No battery limit or currents.',
  },
  {
    id: 'realistic',
    label: 'Realistic',
    description:
      'Research-sub speed, true light and sensor range, no waypoints, battery and oxygen, currents.',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Your own mix of the individual options.',
  },
];

/** One-line description of a mode. */
export function modeDescription(mode: GameplayMode): string {
  return GAME_MODES.find((m) => m.id === mode)?.description ?? '';
}

/** Display label for one value of a gameplay option (select option text). */
export function gameplayValueLabel(
  key: keyof GameplayOptions,
  value: string | number | boolean,
): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (key === 'simSpeed') return `${value}×`;
  if (value === 'near-site') return 'Near site';
  const text = String(value).replaceAll('-', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Parse a control's string value back into the option's type. */
export function parseGameplayValue(
  choices: readonly (string | number | boolean)[],
  raw: string,
): string | number | boolean {
  const sample = choices[0];
  if (typeof sample === 'number') return Number(raw);
  if (typeof sample === 'boolean') return raw === 'true';
  return raw;
}

/** The part of {@link Save} the pre-dive controls use. */
export interface GameplaySettingsSource {
  get(): SettingsData;
  setGameplayMode(mode: GameplayMode): unknown;
  setGameplayOption<K extends keyof GameplayOptions>(key: K, value: GameplayOptions[K]): unknown;
  onChange(listener: () => void): () => void;
}

let uid = 0;

export class ModeSelector {
  readonly root: HTMLDivElement;
  private readonly inputs = new Map<GameplayMode, HTMLInputElement>();
  private readonly desc: HTMLParagraphElement;
  private readonly unsubscribe: () => void;

  /**
   * @param className extra class for placement styles (e.g. `is-home`).
   * @param source the settings store; picking a mode applies it there.
   */
  constructor(
    className: string,
    private readonly source: GameplaySettingsSource,
    label = 'Game mode',
  ) {
    const id = `mode-${++uid}`;
    this.root = document.createElement('div');
    this.root.className = `mode-selector ${className}`.trim();
    const heading = document.createElement('span');
    heading.className = 'mode-selector-label';
    heading.id = `${id}-label`;
    heading.textContent = label;
    const group = document.createElement('div');
    group.className = 'mode-segments';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', heading.id);
    this.desc = document.createElement('p');
    this.desc.className = 'mode-desc';
    this.desc.id = `${id}-desc`;
    group.setAttribute('aria-describedby', this.desc.id);
    for (const mode of GAME_MODES) {
      const seg = document.createElement('label');
      seg.className = 'mode-seg';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = id;
      input.value = mode.id;
      input.dataset.mode = mode.id;
      input.addEventListener('change', () => {
        if (input.checked) this.source.setGameplayMode(mode.id);
      });
      const text = document.createElement('span');
      text.textContent = mode.label;
      seg.append(input, text);
      group.append(seg);
      this.inputs.set(mode.id, input);
    }
    this.root.append(heading, group, this.desc);
    this.set(source.get().gameplayMode);
    this.unsubscribe = source.onChange(() => this.set(source.get().gameplayMode));
  }

  /** Show `mode` as selected (does not write the setting). */
  set(mode: GameplayMode): void {
    for (const [id, input] of this.inputs) input.checked = id === mode;
    this.root.dataset.mode = mode;
    this.desc.textContent = modeDescription(mode);
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
