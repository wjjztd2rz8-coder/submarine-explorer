/**
 * Game mode segmented control: Arcade / Realistic
 * as two radio segments with Custom options in Advanced. A one-line description shows the current
 * mode. The same control appears on the home screen, in the briefing's Dive
 * settings and at the top of Settings > Gameplay; each instance reads and
 * writes the one `gameplayMode` setting through {@link Save}.
 *
 * Native radios keep keyboard behaviour for free: Tab reaches the group,
 * arrow keys move between modes (and apply them, as radios do).
 */

import { el } from './dom.js';
import type { GameplayOptions } from '../core/Config.js';
import { DEFAULT_SETTINGS } from '../core/config/ui.js';
import { GAMEPLAY_LABELS, GAMEPLAY_NOTES, gameplayKeysInOrder } from '../core/config/modes.js';
import type { GameplayMode, SettingsData } from '../core/Save.js';

export const GAME_MODES: ReadonlyArray<{ id: GameplayMode; label: string; description: string }> = [
  {
    id: 'arcade',
    label: 'Arcade',
    description: 'Fast travel and waypoints. No battery limit or currents.',
  },
  {
    id: 'realistic',
    label: 'Realistic',
    description: 'True speed and light. Battery, oxygen and currents; no waypoints.',
  },
];

/** One-line description of a mode. */
export function modeDescription(
  mode: GameplayMode,
  baseMode: 'arcade' | 'realistic' = 'arcade',
): string {
  if (mode === 'custom')
    return `Your switches with ${baseMode === 'realistic' ? 'Realistic' : 'Arcade'} speed, lights and sensors.`;
  return GAME_MODES.find((m) => m.id === mode)?.description ?? '';
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
  private readonly controls = new Map<keyof GameplayOptions, HTMLInputElement>();
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
    optionChoices = DEFAULT_SETTINGS.gameplayOptions,
  ) {
    const id = `mode-${++uid}`;
    this.root = el('div', `mode-selector ${className}`.trim());
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
      const field = el('div', 'mode-advanced-field');
      const name = el('label', undefined, GAMEPLAY_LABELS[key]);
      name.htmlFor = `${id}-${key}`;
      const control = el('input');
      control.type = 'checkbox';
      control.setAttribute('role', 'switch');
      control.id = name.htmlFor;
      control.dataset.gameplay = key;
      control.addEventListener('change', () => {
        const value =
          key === 'currents'
            ? control.checked
              ? 'realistic'
              : 'off'
            : key === 'startPosition'
              ? control.checked
                ? 'surface'
                : 'near-site'
              : control.checked;
        source.setGameplayOption(key, value as never);
      });
      field.append(name, control);
      if (GAMEPLAY_NOTES[key]) {
        const note = document.createElement('small');
        note.id = `${id}-${key}-note`;
        note.textContent = GAMEPLAY_NOTES[key]!;
        control.setAttribute('aria-describedby', note.id);
        field.append(note);
      }
      this.controls.set(key, control);
      this.advancedPanel.append(field);
    }
    this.root.append(heading, group, this.desc, this.advancedToggle, this.advancedPanel);
    this.set(source.get().gameplayMode);
    this.unsubscribe = source.onChange(() => this.set(source.get().gameplayMode));
  }

  /** Show `mode` as selected (does not write the setting). */
  set(mode: GameplayMode): void {
    const settings = this.source.get();
    for (const [id, input] of this.inputs) input.checked = id === mode;
    this.root.dataset.mode = mode;
    this.desc.textContent = modeDescription(mode, settings.gameplayBaseMode);
    this.customTag.hidden = mode !== 'custom';
    const gameplay = settings.gameplay;
    for (const [key, control] of this.controls) {
      control.checked =
        key === 'currents'
          ? gameplay.currents !== 'off'
          : key === 'startPosition'
            ? gameplay.startPosition === 'surface'
            : Boolean(gameplay[key]);
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
