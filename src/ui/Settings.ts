/**
 * Settings screen (C5, docs/settings.md, plan/PHASE-C-CONTRACTS.md §4).
 *
 * A modal DOM dialog opened with the `toggleSettings` binding (O by default)
 * or the HUD's settings hint. It edits {@link Save} (graphics tier, post FX,
 * terrain detail, default sim speed, reduce motion, captions, sonar palette)
 * and the live action map (`Input.actions`, persisted by `Input` itself).
 *
 * While open:
 * - main.ts freezes the game (`isOpen`, like the briefing and the globe);
 * - every keydown is stopped at the window capture phase, so the game's
 *   `Input`, the briefing and the field guide never see it (keyups pass so no
 *   game key sticks). Native control behaviour (Space on a checkbox, arrows
 *   in a select) is a default action and still works;
 * - Tab cycles inside the dialog ({@link FocusTrap}); Escape or the toggle
 *   key closes it.
 *
 * Rebinding: activate an action's key button, then press a key. The key
 * becomes that action's primary binding (secondaries are kept). Another
 * action holding the key loses it (`Input.rebind`); the status line says so,
 * and an action left with no key shows "Unbound" and stays unbound across a
 * reload. Escape cancels a capture; Escape and Tab cannot be bound.
 */

import type {
  GameConfig,
  GameplayOptions,
  GraphicsTier,
  SonarPaletteName,
} from '../core/Config.js';
import { keyLabel, type ActionBinding, type ActionId } from '../core/Input.js';
import type { Save, SettingsData, SettingsValues } from '../core/Save.js';
import { FocusTrap } from './FocusTrap.js';

/** Keys the dialog itself needs; never offered as a binding. */
export const RESERVED_KEYS: readonly string[] = ['Escape', 'Tab'];

/** The subset of `Input` the screen uses. */
export interface SettingsInput {
  readonly actions: ActionBinding[];
  rebind(id: ActionId, keys: string[]): boolean;
  resetBindings(): void;
}

export interface RebindPlan {
  /** The action's new key list (the pressed key first). */
  keys: string[];
  /** Other actions that lose the key, with what they keep. */
  displaced: Array<{ id: ActionId; label: string; remaining: string[] }>;
}

/**
 * What binding `code` as `id`'s primary key does, without doing it. Null for
 * a reserved key or an unknown action. Pure; unit tested.
 */
export function planRebind(
  actions: readonly ActionBinding[],
  id: ActionId,
  code: string,
): RebindPlan | null {
  const action = actions.find((a) => a.id === id);
  if (!action || !code || RESERVED_KEYS.includes(code)) return null;
  const keys = [code, ...action.keys.slice(1).filter((k) => k !== code)];
  const displaced = actions
    .filter((a) => a.id !== id && a.keys.includes(code))
    .map((a) => ({ id: a.id, label: a.label, remaining: a.keys.filter((k) => k !== code) }));
  return { keys, displaced };
}

/** The status line after a rebind (announced through a live region). */
export function rebindMessage(label: string, code: string, plan: RebindPlan): string {
  const key = keyLabel(code);
  const parts = [`${label} is now ${key}.`];
  for (const d of plan.displaced) {
    parts.push(
      d.remaining.length
        ? `${key} was removed from ${d.label} (still ${d.remaining.map(keyLabel).join(' / ')}).`
        : `${key} was taken from ${d.label}, which is now unbound.`,
    );
  }
  return parts.join(' ');
}

/** Button text for an action's keys. */
export function keysText(keys: readonly string[]): string {
  return keys.length ? [...new Set(keys.map(keyLabel))].join(' / ') : 'Unbound';
}

export interface SettingsScreenOptions {
  save: Save;
  input: SettingsInput;
  config: Pick<GameConfig, 'settings' | 'sonarPalettes'>;
  /** The tier this dive actually runs at. */
  activeTier: GraphicsTier;
  /** Boot values; these settings cannot change the current terrain or dive. */
  activeDetailStrength: number;
  activeSimSpeedDefault: number;
  /** True when `?tier=` overrides the saved tier. */
  tierFromUrl?: boolean;
  /** False while something else owns the keyboard (e.g. the globe). */
  canOpen?: () => boolean;
  /** After any rebind / reset (the HUD help re-renders). */
  onBindingsChanged?: () => void;
  onRequestPointerLock?: () => void;
  onOpen?: () => void;
  /** Clears the discovery key and current store only when it can be verified. */
  onResetProgress?: () => 'cleared' | 'sessionOnly' | 'protected' | 'unavailable';
  parent?: HTMLElement;
}

let uid = 0;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class SettingsScreen {
  readonly root: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly status: HTMLParagraphElement;
  private readonly reloadButton: HTMLButtonElement;
  private readonly reloadNote: HTMLParagraphElement;
  private readonly resetProgressButton: HTMLButtonElement;
  private readonly resetConfirm: HTMLDivElement;
  private readonly bindingsList: HTMLDivElement;
  private readonly controlsSection: HTMLElement;
  private readonly normalSections: HTMLElement[];
  private readonly title: HTMLHeadingElement;
  private readonly controlsButton: HTMLButtonElement;
  private readonly backButton: HTMLButtonElement;
  private readonly trap: FocusTrap;
  private readonly controls = new Map<keyof SettingsValues, HTMLInputElement | HTMLSelectElement>();
  private readonly gameplayControls = new Map<
    keyof GameplayOptions,
    HTMLInputElement | HTMLSelectElement
  >();
  private readonly detailOut: HTMLOutputElement;
  private readonly bindButtons = new Map<ActionId, HTMLButtonElement>();
  private open_ = false;
  private capturing: ActionId | null = null;
  private returnFocus: HTMLElement | null = null;
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly opts: SettingsScreenOptions) {
    const id = `settings-${++uid}`;
    this.root = el('div', 'settings');
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', `${id}-title`);

    this.panel = el('div', 'settings-panel');
    this.panel.tabIndex = -1;

    const header = el('div', 'settings-header');
    const title = el('h2', 'settings-title', 'Settings');
    this.title = title;
    title.id = `${id}-title`;
    const close = el('button', 'settings-close', 'Close (Esc)');
    close.type = 'button';
    close.addEventListener('click', () => this.close());
    this.controlsButton = el('button', 'settings-controls-open', 'Controls');
    this.controlsButton.type = 'button';
    this.controlsButton.addEventListener('click', () => this.showControls(true));
    this.backButton = el('button', 'settings-controls-back', 'Back to Settings');
    this.backButton.type = 'button';
    this.backButton.hidden = true;
    this.backButton.addEventListener('click', () => this.showControls(false));
    header.append(title, this.controlsButton, this.backButton, close);

    const cfg = opts.config;
    const tierNote = opts.tierFromUrl
      ? `This dive uses ${opts.activeTier} from the ?tier= URL parameter.`
      : `This dive uses ${opts.activeTier}. A change applies after a reload.`;

    const graphics = this.section(`${id}-gfx`, 'Graphics');
    graphics.append(
      this.select(
        'graphicsTier',
        'Graphics tier',
        [
          ['low', 'Low'],
          ['medium', 'Medium'],
          ['high', 'High'],
        ],
        tierNote,
      ),
      this.checkbox('postFx', 'Post-processing (colour grade, vignette)'),
    );
    const detail = this.range(
      'detailStrength',
      'Terrain detail on top of the survey data',
      cfg.settings.detailStrengthMax,
      cfg.settings.detailStrengthStep,
      '0 shows the survey data only. Applies after a reload.',
    );
    this.detailOut = detail.querySelector('output') as HTMLOutputElement;
    graphics.append(detail);

    // --- D-MODES begin ---
    const gameplay = this.section(`${id}-gameplay`, 'Gameplay');
    const mode = el('select');
    mode.dataset.setting = 'gameplayMode';
    for (const [value, label] of [
      ['arcade', 'Arcade'],
      ['realistic', 'Realistic'],
      ['custom', 'Custom'],
    ]) {
      const option = el('option', undefined, label);
      option.value = value;
      mode.append(option);
    }
    mode.addEventListener('change', () =>
      opts.save.setGameplayMode(mode.value as SettingsData['gameplayMode']),
    );
    this.controls.set('gameplayMode', mode);
    gameplay.append(
      this.field(
        'Mode',
        mode,
        'Fast travel is a game setting across hull classes; Alvin-like research speed is about 1 m/s.',
      ),
    );
    const labels: Record<keyof GameplayOptions, string> = {
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
    for (const key of Object.keys(cfg.settings.gameplayOptions) as Array<keyof GameplayOptions>) {
      const choices = cfg.settings.gameplayOptions[key] as readonly (string | number | boolean)[];
      const input = el('select');
      input.dataset.gameplay = key;
      for (const choice of choices) {
        const option = el(
          'option',
          undefined,
          typeof choice === 'boolean'
            ? choice
              ? 'On'
              : 'Off'
            : choice === 'near-site'
              ? 'Near site'
              : typeof choice === 'number' && key === 'simSpeed'
                ? `${choice}×`
                : String(choice).replaceAll('-', ' '),
        );
        option.value = String(choice);
        input.append(option);
      }
      input.addEventListener('change', () => {
        const sample = choices[0];
        const value =
          typeof sample === 'number'
            ? Number(input.value)
            : typeof sample === 'boolean'
              ? input.value === 'true'
              : input.value;
        opts.save.setGameplayOption(key, value as never);
      });
      this.gameplayControls.set(key, input);
      gameplay.append(this.field(labels[key], input));
    }
    // --- D-MODES end ---

    const access = this.section(`${id}-a11y`, 'Accessibility');
    access.append(
      this.checkbox('reduceMotion', 'Reduce motion (no camera banking)'),
      this.checkbox('captions', 'Captions for sounds'),
      this.select(
        'sonarPalette',
        'Sonar map colours',
        (Object.keys(cfg.sonarPalettes) as SonarPaletteName[]).map((k): [string, string] => [
          k,
          cfg.sonarPalettes[k].label,
        ]),
      ),
    );
    const uiScale = el('input');
    uiScale.type = 'number';
    uiScale.min = '80';
    uiScale.max = '150';
    uiScale.step = '1';
    uiScale.dataset.setting = 'uiScale';
    uiScale.addEventListener('change', () => opts.save.save({ uiScale: Number(uiScale.value) }));
    this.controls.set('uiScale', uiScale);
    access.append(this.field('UI scale (%)', uiScale));
    access.append(this.checkbox('controlTips', 'Control tips'));

    const keys = this.section(`${id}-keys`, 'Controls');
    this.controlsSection = keys;
    keys.hidden = true;
    const keysHint = el(
      'p',
      'settings-note',
      'Choose an action, then press a key. Escape cancels. A key already in use moves to the new action.',
    );
    this.bindingsList = el('div', 'settings-bindings');
    this.bindingsList.setAttribute('role', 'list');
    const pointerLock = el('button', 'settings-pointer-lock', 'Enable pointer look');
    pointerLock.type = 'button';
    pointerLock.addEventListener('click', () => {
      this.close();
      this.opts.onRequestPointerLock?.();
    });
    const cameraNote = el(
      'p',
      'settings-note',
      'Drag on the dive view to look; use the wheel to zoom. The HUD button and a double-click reset the camera. Pointer look is optional.',
    );
    keys.append(keysHint, cameraNote, pointerLock, this.bindingsList);

    this.status = el('p', 'settings-status');
    this.status.setAttribute('role', 'status');
    this.status.setAttribute('aria-live', 'polite');

    this.resetConfirm = el('div', 'settings-confirm');
    this.resetConfirm.hidden = true;
    this.resetConfirm.append(
      el(
        'p',
        undefined,
        'Clear all discoveries and scan history? This cannot be undone. Your settings and key bindings stay saved. This dive will restart at the same URL.',
      ),
    );
    const confirmReset = el('button', undefined, 'Clear discoveries');
    confirmReset.type = 'button';
    confirmReset.addEventListener('click', () => {
      this.resetConfirm.hidden = true;
      let result: ReturnType<NonNullable<SettingsScreenOptions['onResetProgress']>> = 'unavailable';
      try {
        result = this.opts.onResetProgress?.() ?? 'unavailable';
      } catch {
        result = 'unavailable';
      }
      if (result === 'cleared' || result === 'sessionOnly') {
        this.say(
          result === 'cleared'
            ? 'Discoveries cleared. Reloading this dive…'
            : 'Session discoveries cleared. Saved progress was inaccessible and may return. Reloading this dive…',
        );
        window.setTimeout(() => window.location.reload(), 600);
      } else {
        this.say(
          result === 'protected'
            ? 'Saved discoveries use a newer version and were left intact.'
            : 'Could not verify that saved discoveries were cleared. Nothing was reset.',
        );
        this.resetProgressButton.focus();
      }
    });
    const cancelReset = el('button', undefined, 'Cancel');
    cancelReset.type = 'button';
    cancelReset.addEventListener('click', () => {
      this.resetConfirm.hidden = true;
      this.resetProgressButton.focus();
      this.say('Reset cancelled.');
    });
    this.resetConfirm.append(confirmReset, cancelReset);

    const footer = el('div', 'settings-footer');
    this.reloadButton = el('button', 'settings-reload', 'Apply and reload');
    this.reloadButton.type = 'button';
    this.reloadButton.hidden = true;
    this.reloadButton.addEventListener('click', () => window.location.reload());
    this.reloadNote = el('p', 'settings-note settings-reload-note');
    this.reloadNote.hidden = true;
    const resetSettings = el('button', 'settings-reset', 'Reset settings');
    resetSettings.type = 'button';
    resetSettings.addEventListener('click', () => {
      this.opts.save.reset();
      this.sync();
      this.say(
        this.opts.save.reloadSafe
          ? 'Settings reset to defaults.'
          : this.opts.save.protectedVersion
            ? 'Settings reset for this session. The newer saved version was left intact.'
            : 'Settings reset for this session. Storage is unavailable or could not be cleared.',
      );
    });
    const resetKeys = el('button', 'settings-reset-keys', 'Reset key bindings');
    resetKeys.type = 'button';
    resetKeys.addEventListener('click', () => {
      this.capturing = null;
      this.opts.input.resetBindings();
      this.renderBindings();
      this.opts.onBindingsChanged?.();
      this.say('Key bindings reset to defaults.');
    });
    this.resetProgressButton = el('button', 'settings-reset-progress', 'Reset discoveries');
    this.resetProgressButton.type = 'button';
    this.resetProgressButton.addEventListener('click', () => {
      this.resetConfirm.hidden = false;
      this.say('Confirm to clear discoveries and scan history.');
      confirmReset.focus();
    });
    footer.append(this.reloadButton, resetSettings, resetKeys, this.resetProgressButton);

    this.panel.append(
      header,
      graphics,
      gameplay,
      access,
      keys,
      this.status,
      this.resetConfirm,
      this.reloadNote,
      footer,
    );
    this.normalSections = [graphics, gameplay, access];
    this.root.append(this.panel);
    (opts.parent ?? document.body).appendChild(this.root);
    this.trap = new FocusTrap(this.root);

    this.renderBindings();
    this.sync();
    this.disposers.push(opts.save.onChange(() => this.sync()));
    this.bindKeys();
  }

  get isOpen(): boolean {
    return this.open_;
  }

  /** The action being captured, if any (tests). */
  get capturingAction(): ActionId | null {
    return this.capturing;
  }

  open(): void {
    if (this.open_) return;
    if (this.opts.canOpen && !this.opts.canOpen()) return;
    this.open_ = true;
    this.opts.onOpen?.();
    const a = document.activeElement;
    this.returnFocus = a instanceof HTMLElement && a !== document.body ? a : null;
    this.root.hidden = false;
    this.showControls(false);
    this.renderBindings();
    this.sync();
    this.say('');
    this.trap.activate();
    this.panel.focus();
  }

  close(): void {
    if (!this.open_) return;
    this.open_ = false;
    this.capturing = null;
    this.resetConfirm.hidden = true;
    this.root.hidden = true;
    this.showControls(false);
    this.trap.deactivate();
    if (this.returnFocus?.isConnected) this.returnFocus.focus();
    this.returnFocus = null;
  }

  toggle(): void {
    if (this.open_) this.close();
    else this.open();
  }

  dispose(): void {
    this.close();
    for (const d of this.disposers) d();
    this.root.remove();
  }

  showControls(show: boolean): void {
    this.controlsSection.hidden = !show;
    for (const section of this.normalSections) section.hidden = show;
    this.title.textContent = show ? 'Controls' : 'Settings';
    this.controlsButton.hidden = show;
    this.backButton.hidden = !show;
    if (this.open_) (show ? this.backButton : this.controlsButton).focus();
  }

  // -------------------------------------------------------------- controls

  private section(id: string, heading: string): HTMLElement {
    const s = el('section', 'settings-section');
    const h = el('h3', 'settings-heading', heading);
    h.id = id;
    s.setAttribute('aria-labelledby', id);
    s.append(h);
    return s;
  }

  private field(label: string, control: HTMLElement, note?: string): HTMLDivElement {
    const row = el('div', 'settings-row');
    const id = `settings-f-${++uid}`;
    control.id = id;
    const l = el('label', 'settings-label', label);
    l.htmlFor = id;
    row.append(l, control);
    if (note) {
      const n = el('p', 'settings-note', note);
      n.id = `${id}-note`;
      control.setAttribute('aria-describedby', n.id);
      row.append(n);
    }
    return row;
  }

  private checkbox(
    key: 'postFx' | 'reduceMotion' | 'captions' | 'controlTips',
    label: string,
  ): HTMLDivElement {
    const input = el('input');
    input.type = 'checkbox';
    input.dataset.setting = key;
    input.addEventListener('change', () => this.opts.save.save({ [key]: input.checked }));
    this.controls.set(key, input);
    const row = this.field(label, input);
    row.classList.add('is-check');
    return row;
  }

  private select(
    key: 'graphicsTier' | 'simSpeedDefault' | 'sonarPalette',
    label: string,
    options: Array<[string, string]>,
    note?: string,
  ): HTMLDivElement {
    const sel = el('select');
    sel.dataset.setting = key;
    for (const [value, text] of options) {
      const o = el('option', undefined, text);
      o.value = value;
      sel.append(o);
    }
    sel.addEventListener('change', () => {
      const v = key === 'simSpeedDefault' ? Number(sel.value) : sel.value;
      this.opts.save.save({ [key]: v } as Partial<SettingsValues>);
    });
    this.controls.set(key, sel);
    return this.field(label, sel, note);
  }

  private range(
    key: 'detailStrength',
    label: string,
    max: number,
    step: number,
    note: string,
  ): HTMLDivElement {
    const input = el('input');
    input.type = 'range';
    input.min = '0';
    input.max = String(max);
    input.step = String(step);
    input.dataset.setting = key;
    const out = el('output', 'settings-output');
    input.addEventListener('input', () => {
      out.value = Number(input.value).toFixed(2);
    });
    input.addEventListener('change', () => this.opts.save.save({ [key]: Number(input.value) }));
    this.controls.set(key, input);
    const row = this.field(label, input, note);
    out.htmlFor.add(input.id);
    input.after(out);
    return row;
  }

  /** Push the saved values into the controls. */
  private sync(): void {
    const s: SettingsData = this.opts.save.get();
    for (const [key, c] of this.controls) {
      const v = s[key];
      if (c instanceof HTMLInputElement && c.type === 'checkbox') c.checked = Boolean(v);
      else c.value = String(v);
      if (key === 'detailStrength') {
        this.detailOut.value = Number(v).toFixed(2);
        c.setAttribute('aria-valuetext', Number(v).toFixed(2));
      }
    }
    for (const [key, control] of this.gameplayControls) control.value = String(s.gameplay[key]);
    const pending =
      (!this.opts.tierFromUrl && s.graphicsTier !== this.opts.activeTier) ||
      s.detailStrength !== this.opts.activeDetailStrength ||
      s.simSpeedDefault !== this.opts.activeSimSpeedDefault;
    this.reloadButton.hidden = !pending || !this.opts.save.reloadSafe;
    this.reloadNote.hidden = !pending;
    if (!this.reloadNote.hidden) {
      this.reloadNote.textContent = this.opts.save.reloadSafe
        ? 'Applying these settings restarts this dive at the same URL.'
        : this.opts.save.protectedVersion
          ? 'Saved settings use a newer version. Changes cannot survive a reload.'
          : 'These settings could not be saved. Reloading may restore the previous values.';
    }
  }

  // -------------------------------------------------------------- bindings

  private renderBindings(): void {
    this.bindButtons.clear();
    const rows = this.opts.input.actions
      .filter((a) => a.id !== 'toggleSettings' && a.id !== 'toggleGlobe')
      .map((a) => {
        const row = el('div', 'settings-binding');
        row.setAttribute('role', 'listitem');
        const name = el('span', 'settings-binding-label', a.label);
        const btn = el('button', 'settings-binding-key');
        btn.type = 'button';
        btn.dataset.action = a.id;
        btn.addEventListener('click', () => this.startCapture(a.id));
        this.bindButtons.set(a.id, btn);
        this.paintBinding(a);
        row.append(name, btn);
        if (a.pad) row.append(el('span', 'settings-binding-pad', a.pad));
        return row;
      });
    this.bindingsList.replaceChildren(...rows);
  }

  private paintBinding(a: ActionBinding): void {
    const btn = this.bindButtons.get(a.id);
    if (!btn) return;
    const capturing = this.capturing === a.id;
    btn.textContent = capturing ? 'Press a key…' : keysText(a.keys);
    btn.classList.toggle('is-capturing', capturing);
    btn.classList.toggle('is-unbound', !a.keys.length);
    btn.setAttribute(
      'aria-label',
      capturing
        ? `${a.label}: press a key, Escape cancels`
        : `${a.label}: ${keysText(a.keys)}. Activate to rebind.`,
    );
  }

  private startCapture(id: ActionId): void {
    const prev = this.capturing;
    this.capturing = id;
    for (const a of this.opts.input.actions) {
      if (a.id === id || a.id === prev) this.paintBinding(a);
    }
    const a = this.opts.input.actions.find((x) => x.id === id);
    this.say(a ? `Press a key for ${a.label}. Escape cancels.` : '');
  }

  private cancelCapture(message = 'Rebinding cancelled.'): void {
    const id = this.capturing;
    this.capturing = null;
    const a = this.opts.input.actions.find((x) => x.id === id);
    if (a) this.paintBinding(a);
    this.say(message);
  }

  private commitCapture(code: string): void {
    const id = this.capturing;
    if (!id) return;
    const action = this.opts.input.actions.find((a) => a.id === id);
    const plan = planRebind(this.opts.input.actions, id, code);
    if (!action || !plan) {
      this.cancelCapture(`${keyLabel(code)} is reserved for the menus.`);
      return;
    }
    this.capturing = null;
    this.opts.input.rebind(id, plan.keys);
    for (const a of this.opts.input.actions) this.paintBinding(a);
    this.opts.onBindingsChanged?.();
    this.say(rebindMessage(action.label, code, plan));
  }

  private say(text: string): void {
    this.status.textContent = text;
  }

  private isToggleKey(code: string): boolean {
    return (
      this.opts.input.actions.find((a) => a.id === 'toggleSettings')?.keys.includes(code) ?? false
    );
  }

  private bindKeys(): void {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!this.open_) {
        const t = e.target as HTMLElement | null;
        const typing =
          t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (!e.repeat && !typing && this.isToggleKey(e.code) && this.opts.canOpen?.() !== false) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.open();
        }
        return;
      }
      // Nothing behind the dialog sees keys while it is open: not the game's
      // Input, nor the briefing/debrief/guide handlers, including capture
      // listeners registered after this one (main.ts builds the screen before
      // the mission router). Tab is only stopped from propagating, so the
      // FocusTrap listener on this same node and phase still cycles focus.
      if (e.code === 'Tab') e.stopPropagation();
      else e.stopImmediatePropagation();
      if (this.capturing) {
        if (e.code === 'Tab') {
          this.cancelCapture();
          return;
        }
        e.preventDefault();
        if (e.repeat) return;
        if (e.code === 'Escape') this.cancelCapture();
        else this.commitCapture(e.code);
        return;
      }
      if (!this.resetConfirm.hidden && e.code === 'Escape') {
        e.preventDefault();
        this.resetConfirm.hidden = true;
        this.resetProgressButton.focus();
        this.say('Reset cancelled.');
        return;
      }
      if (e.code === 'Escape' || (!e.repeat && this.isToggleKey(e.code))) {
        e.preventDefault();
        this.close();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    this.disposers.push(() => window.removeEventListener('keydown', onKeyDown, true));
  }
}
