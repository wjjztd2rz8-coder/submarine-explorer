/**
 * Game mode segmented control (D2-PREDIVE, playtest #3): Arcade / Realistic
 * as two radio segments with Custom options in Advanced. A one-line description shows the current
 * mode. The same control appears on the home screen, in the briefing's Dive
 * settings and at the top of Settings > Gameplay; each instance reads and
 * writes the one `gameplayMode` setting through {@link Save}.
 *
 * Native radios keep keyboard behaviour for free: Tab reaches the group,
 * arrow keys move between modes (and apply them, as radios do).
 */

import type { GameplayOptions } from '../core/Config.js';
import { DEFAULT_SETTINGS } from '../core/config/ui.js';
import {
  CURRENT_CHOICES,
  GAMEPLAY_LABELS,
  GAMEPLAY_NOTES,
  gameplayKeysInOrder,
} from '../core/config/modes.js';
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
];

/** One-line description of a mode. */
export function modeDescription(mode: GameplayMode): string {
  if (mode === 'custom') return 'Your own mix of the individual options.';
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
  readonly advancedToggle: HTMLButtonElement;
  readonly advancedPanel: HTMLDivElement;
  private readonly customTag: HTMLSpanElement;
  private readonly controls = new Map<keyof GameplayOptions, HTMLSelectElement>();
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
    exclude: readonly (keyof GameplayOptions)[] = [],
    optionChoices = DEFAULT_SETTINGS.gameplayOptions,
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
    this.customTag = document.createElement('span');
    this.customTag.className = 'mode-custom-tag';
    this.customTag.textContent = 'Custom';
    this.customTag.setAttribute('role', 'status');
    heading.append(this.customTag);
    this.advancedToggle = document.createElement('button');
    this.advancedToggle.type = 'button';
    this.advancedToggle.className = 'mode-advanced-toggle';
    this.advancedToggle.textContent = 'Advanced';
    this.advancedToggle.setAttribute('aria-expanded', 'false');
    this.advancedToggle.setAttribute('aria-controls', `${id}-advanced`);
    this.advancedPanel = document.createElement('div');
    this.advancedPanel.className = 'mode-advanced';
    this.advancedPanel.id = `${id}-advanced`;
    this.advancedPanel.hidden = true;
    this.advancedToggle.addEventListener('click', () =>
      this.setAdvancedOpen(!!this.advancedPanel.hidden),
    );
    for (const key of gameplayKeysInOrder(optionChoices)) {
      if (exclude.includes(key)) continue;
      const choices = key === 'currents' ? CURRENT_CHOICES : optionChoices[key];
      const field = document.createElement('div');
      field.className = 'mode-advanced-field';
      const name = document.createElement('label');
      name.htmlFor = `${id}-${key}`;
      name.textContent = GAMEPLAY_LABELS[key];
      const select = document.createElement('select');
      select.id = name.htmlFor;
      select.dataset.gameplay = key;
      for (const choice of choices) {
        const option = document.createElement('option');
        option.value = String(choice);
        option.textContent = gameplayValueLabel(key, choice);
        select.append(option);
      }
      // Preserve the retired Gentle value until the player chooses another setting.
      if (key === 'currents' && source.get().gameplay.currents === 'gentle') {
        const legacy = document.createElement('option');
        legacy.value = 'gentle';
        legacy.textContent = 'Gentle';
        legacy.hidden = true;
        select.append(legacy);
      }
      select.addEventListener('change', () =>
        source.setGameplayOption(key, parseGameplayValue(choices, select.value) as never),
      );
      field.append(name, select);
      if (GAMEPLAY_NOTES[key]) {
        const note = document.createElement('small');
        note.id = `${id}-${key}-note`;
        note.textContent = GAMEPLAY_NOTES[key]!;
        select.setAttribute('aria-describedby', note.id);
        field.append(note);
      }
      this.controls.set(key, select);
      this.advancedPanel.append(field);
    }
    this.root.append(heading, group, this.desc, this.advancedToggle, this.advancedPanel);
    this.set(source.get().gameplayMode);
    this.unsubscribe = source.onChange(() => this.set(source.get().gameplayMode));
  }

  /** Show `mode` as selected (does not write the setting). */
  set(mode: GameplayMode): void {
    for (const [id, input] of this.inputs) input.checked = id === mode;
    this.root.dataset.mode = mode;
    this.desc.textContent = modeDescription(mode);
    this.customTag.hidden = mode !== 'custom';
    const gameplay = this.source.get().gameplay;
    for (const [key, control] of this.controls) {
      if (
        key === 'currents' &&
        gameplay.currents === 'gentle' &&
        !control.querySelector('option[value="gentle"]')
      ) {
        const legacy = document.createElement('option');
        legacy.value = 'gentle';
        legacy.textContent = 'Gentle';
        legacy.hidden = true;
        control.append(legacy);
      }
      control.value = String(gameplay[key]);
    }
  }

  setAdvancedOpen(open: boolean): void {
    this.advancedPanel.hidden = !open;
    this.advancedToggle.setAttribute('aria-expanded', String(open));
  }

  dispose(): void {
    this.unsubscribe();
    this.root.remove();
  }
}
