/**
 * Keyboard + mouse + gamepad abstraction, built on a remappable **action map**.
 *
 * Consumers never read raw keys; they read the normalised {@link InputState}:
 *
 *     throttle  -1 (full reverse) .. +1 (full ahead)
 *     yaw       -1 (port)         .. +1 (starboard)
 *     pitch     -1 (nose down)    .. +1 (nose up)
 *     ballast   -1 (dive)         .. +1 (surface)
 *
 * so a gamepad stick, a key, or a future touch control are interchangeable.
 *
 * Bindings live in {@link Input.actions}: an ordered list of action
 * descriptors, each with a label, a category and the `KeyboardEvent.code`s
 * bound to it. A settings screen can render that list verbatim, call
 * {@link Input.rebind}, and the change is persisted to `localStorage` under
 * {@link BINDINGS_STORAGE_KEY} (versioned, so a future action rename can
 * migrate or discard cleanly).
 *
 * Gamepads use the W3C "standard" mapping and take over the moment a control is
 * actually deflected, so you can pick a pad up mid-dive without a mode switch.
 */

export interface InputState {
  throttle: number;
  yaw: number;
  pitch: number;
  ballast: number;
  /** Camera drag or pointer-lock delta since the previous frame, in pixels. */
  lookDx: number;
  lookDy: number;
  /** Edge-triggered actions; cleared by {@link Input.endFrame}. */
  toggleCamera: boolean;
  resetCamera?: boolean;
  toggleSonar: boolean;
  boost: boolean;
  /** Headlights (A2 owns the lights themselves; this is just the edge). */
  toggleLights: boolean;
  /** Legacy audio edge kept for consumers; no player action drives it. */
  ping: boolean;
  /** Hold-to-scan beam (B1). Level-triggered, not an edge. */
  scan: boolean;
  /** Cycle the sim-speed multiplier 1x -> 2x -> 3x -> 1x. */
  cycleSimSpeed: boolean;
  /** Cycle the camera into and out of free-orbit photo mode. */
  togglePhotoMode: boolean;
  /** Enter or Space captures the current photo-mode frame. */
  capturePhoto?: boolean;
  /**
   * Open/close the field guide (B1). Edge-triggered. Optional so existing
   * hand-built InputState literals (tests, Submarine's locked input) still type.
   */
  toggleGuide?: boolean;
  /** Open/close the globe mission select (C1). Edge-triggered; optional like toggleGuide. */
  toggleGlobe?: boolean;
  /** Deploy or recall the tethered ROV. */
  toggleRov?: boolean;
}

/** One rebindable thing the player can do. */
export interface ActionBinding {
  id: ActionId;
  label: string;
  category: 'Piloting' | 'Systems' | 'View';
  /** `KeyboardEvent.code` values. First entry is the "primary" binding. */
  keys: string[];
  /** Human-readable gamepad hint, for the settings screen. Not rebindable yet. */
  pad?: string;
}

export type ActionId =
  | 'thrustForward'
  | 'thrustReverse'
  | 'yawPort'
  | 'yawStarboard'
  | 'pitchUp'
  | 'pitchDown'
  | 'ballastBlow'
  | 'ballastFlood'
  | 'boost'
  | 'toggleCamera'
  | 'resetCamera'
  | 'toggleSonar'
  | 'toggleLights'
  | 'scan'
  | 'cycleSimSpeed'
  | 'togglePhotoMode'
  | 'capturePhoto'
  | 'toggleSettings'
  | 'toggleGuide'
  | 'toggleJournal'
  | 'toggleGlobe'
  | 'toggleRov';

/** Factory, not a constant: callers get their own mutable copy. */
export function defaultActions(): ActionBinding[] {
  return [
    {
      id: 'thrustForward',
      label: 'Ahead',
      category: 'Piloting',
      keys: ['KeyW', 'ArrowUp'],
      pad: 'Left stick up',
    },
    {
      id: 'thrustReverse',
      label: 'Astern',
      category: 'Piloting',
      keys: ['KeyS', 'ArrowDown'],
      pad: 'Left stick down',
    },
    {
      id: 'yawPort',
      label: 'Yaw port',
      category: 'Piloting',
      keys: ['KeyA', 'ArrowLeft'],
      pad: 'Left stick left',
    },
    {
      id: 'yawStarboard',
      label: 'Yaw starboard',
      category: 'Piloting',
      keys: ['KeyD', 'ArrowRight'],
      pad: 'Left stick right',
    },
    {
      id: 'pitchUp',
      label: 'Nose up',
      category: 'Piloting',
      keys: ['KeyR'],
      pad: 'Right stick up',
    },
    {
      id: 'pitchDown',
      label: 'Nose down',
      category: 'Piloting',
      keys: ['KeyF'],
      pad: 'Right stick down',
    },
    {
      id: 'ballastBlow',
      label: 'Blow ballast (rise)',
      category: 'Piloting',
      keys: ['Space'],
      pad: 'A / cross',
    },
    {
      id: 'ballastFlood',
      label: 'Flood ballast (dive)',
      category: 'Piloting',
      keys: ['ControlLeft', 'ControlRight', 'KeyC'],
      pad: 'B / circle',
    },
    {
      id: 'boost',
      label: 'Boost',
      category: 'Piloting',
      keys: ['ShiftLeft', 'ShiftRight'],
      pad: 'Right trigger',
    },
    { id: 'toggleLights', label: 'Headlights', category: 'Systems', keys: ['KeyL'], pad: 'X' },
    { id: 'scan', label: 'Scan (hold)', category: 'Systems', keys: ['KeyG'], pad: 'Right bumper' },
    { id: 'toggleRov', label: 'Deploy / retrieve ROV', category: 'Systems', keys: ['KeyE'] },
    {
      id: 'cycleSimSpeed',
      label: 'Sim speed',
      category: 'Systems',
      keys: ['KeyT'],
      pad: 'D-pad up',
    },
    { id: 'toggleCamera', label: 'Camera view', category: 'View', keys: ['KeyQ'], pad: 'Y' },
    { id: 'resetCamera', label: 'Reset camera', category: 'View', keys: ['KeyX'] },
    { id: 'toggleSonar', label: 'Sonar map', category: 'View', keys: ['KeyM'], pad: 'Back' },
    { id: 'togglePhotoMode', label: 'Photo mode', category: 'View', keys: ['KeyP'], pad: 'Start' },
    { id: 'capturePhoto', label: 'Capture photo', category: 'View', keys: ['Enter'] },
    { id: 'toggleJournal', label: 'Journal', category: 'View', keys: ['KeyJ'] },
  ];
}

export const BINDINGS_STORAGE_KEY = 'subexplorer.bindings.v3';
export const PREVIOUS_BINDINGS_STORAGE_KEY = 'subexplorer.bindings.v2';
export const LEGACY_BINDINGS_STORAGE_KEY = 'subexplorer.bindings.v1';
const V2_DEFAULTS: Record<string, string[]> = Object.fromEntries(
  defaultActions()
    .filter((a) => a.id !== 'resetCamera')
    .map((a) => [a.id, a.id === 'pitchDown' ? ['KeyV'] : a.id === 'scan' ? ['KeyF'] : a.keys]),
);

const V1_DEFAULTS: Record<string, string[]> = {
  thrustForward: ['KeyW', 'ArrowUp'],
  thrustReverse: ['KeyS', 'ArrowDown'],
  yawPort: ['KeyA', 'ArrowLeft'],
  yawStarboard: ['KeyD', 'ArrowRight'],
  pitchUp: ['KeyR'],
  pitchDown: ['KeyF'],
  ballastBlow: ['Space'],
  ballastFlood: ['ShiftLeft', 'ShiftRight'],
  boost: ['KeyX'],
  toggleLights: ['KeyL'],
  ping: ['KeyQ', 'Tab'],
  scan: ['KeyG'],
  cycleSimSpeed: ['KeyT'],
  toggleCamera: ['KeyC'],
  toggleSonar: ['KeyM'],
  togglePhotoMode: ['KeyP'],
  toggleSettings: ['KeyO'],
  toggleGuide: ['KeyJ'],
  toggleGlobe: ['KeyN'],
};

const DEAD_ZONE = 0.15;

function applyDeadZone(v: number): number {
  return Math.abs(v) < DEAD_ZONE ? 0 : v;
}

/** Minimal storage shape, so tests can inject a stub and Node has no globals. */
export interface BindingStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface InputOptions {
  /** Element that receives mouse events (usually the canvas). */
  target?: HTMLElement | null;
  /** Defaults to `window.localStorage` when it exists. */
  storage?: BindingStore | null;
  /** Pointer lock is opt-in; drag works by default. */
  mouseLook?: boolean;
}

export class Input {
  readonly state: InputState = {
    throttle: 0,
    yaw: 0,
    pitch: 0,
    ballast: 0,
    lookDx: 0,
    lookDy: 0,
    toggleCamera: false,
    resetCamera: false,
    toggleSonar: false,
    boost: false,
    toggleLights: false,
    ping: false,
    scan: false,
    cycleSimSpeed: false,
    togglePhotoMode: false,
    toggleGuide: false,
    toggleGlobe: false,
    toggleRov: false,
  };

  /** The live, rebindable action map. Read it to render a controls screen. */
  readonly actions: ActionBinding[] = defaultActions();

  /** True while a gamepad last supplied the axes, so the UI can swap glyphs. */
  gamepadActive = false;

  private keys = new Set<string>();
  private byId = new Map<ActionId, ActionBinding>();
  private mouseDown = false;
  private mouseLook: boolean;
  get pointerLookActive(): boolean {
    return this.mouseLook;
  }
  private disposers: Array<() => void> = [];
  private readonly target: HTMLElement | null;
  private readonly storage: BindingStore | null;
  private readonly edgeArmed = new Set<ActionId>();
  wheelDelta = 0;

  constructor(options: InputOptions | HTMLElement | null = null) {
    // Back-compatible: `new Input(canvas)` still works alongside the options form.
    const isElement =
      typeof options === 'object' && options !== null && 'nodeType' in (options as object);
    const opts: InputOptions = isElement
      ? { target: options as HTMLElement }
      : ((options as InputOptions | null) ?? {});
    this.target = opts.target ?? null;
    this.mouseLook = opts.mouseLook ?? false;
    this.storage = opts.storage !== undefined ? opts.storage : safeStorage();
    this.reindex();
    this.loadBindings();
  }

  // -------------------------------------------------------------- bindings

  private reindex(): void {
    this.byId.clear();
    for (const a of this.actions) this.byId.set(a.id, a);
  }

  /** Look up one action (for a settings screen or a HUD hint). */
  getAction(id: ActionId): ActionBinding | undefined {
    return this.byId.get(id);
  }

  /** Pretty-print the primary key of an action, e.g. `W`, `Space`, `Shift`. */
  primaryKeyLabel(id: ActionId): string {
    const key = this.byId.get(id === 'toggleGuide' ? 'toggleJournal' : id)?.keys[0];
    return key ? keyLabel(key) : '--';
  }

  /**
   * Replace an action's bindings and persist. Any other action holding one of
   * these codes loses it, so a key is never ambiguous.
   *
   * @returns false if `keys` is empty (use {@link resetBindings} instead).
   */
  rebind(id: ActionId, keys: string[]): boolean {
    const action = this.byId.get(id);
    if (!action || keys.length === 0) return false;
    for (const other of this.actions) {
      if (other.id === id) continue;
      other.keys = other.keys.filter((k) => !keys.includes(k));
    }
    action.keys = [...keys];
    this.saveBindings();
    return true;
  }

  /** Restore the shipped defaults and clear the saved override. */
  resetBindings(): void {
    const defaults = defaultActions();
    for (let i = 0; i < this.actions.length; i++) {
      const d = defaults.find((a) => a.id === this.actions[i]?.id);
      if (d) (this.actions[i] as ActionBinding).keys = [...d.keys];
    }
    try {
      this.storage?.removeItem(BINDINGS_STORAGE_KEY);
      this.storage?.removeItem(PREVIOUS_BINDINGS_STORAGE_KEY);
      this.storage?.removeItem(LEGACY_BINDINGS_STORAGE_KEY);
    } catch {
      // Privacy mode / hostile storage: the defaults still apply this session.
    }
  }

  private saveBindings(): void {
    if (!this.storage) return;
    const payload = {
      version: 3,
      keys: Object.fromEntries(this.actions.map((a) => [a.id, a.keys])),
    };
    try {
      this.storage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Private browsing / quota. Bindings simply do not persist; not fatal.
    }
  }

  /** Keep choices that differ from the defaults of their saved version. */
  private loadBindings(): void {
    if (!this.storage) return;
    let raw: string | null;
    let version: number;
    try {
      raw = this.storage.getItem(BINDINGS_STORAGE_KEY);
      version = 3;
      if (raw === null) {
        raw = this.storage.getItem(PREVIOUS_BINDINGS_STORAGE_KEY);
        version = 2;
      }
      if (raw === null) {
        raw = this.storage.getItem(LEGACY_BINDINGS_STORAGE_KEY);
        version = 1;
      }
    } catch {
      return;
    }
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { version?: number; keys?: Record<string, unknown> };
      if (parsed.version !== version || !parsed.keys || typeof parsed.keys !== 'object') return;
      const custom = new Map<ActionId, string[]>();
      for (const action of this.actions) {
        const oldId = version === 1 && action.id === 'toggleJournal' ? 'toggleGuide' : action.id;
        const value = parsed.keys[oldId];
        if (!Array.isArray(value) || !value.every((k) => typeof k === 'string')) continue;
        const keys = value as string[];
        const oldDefault =
          version === 1 ? V1_DEFAULTS[oldId] : version === 2 ? V2_DEFAULTS[oldId] : undefined;
        if (version === 3 || JSON.stringify(keys) !== JSON.stringify(oldDefault))
          custom.set(action.id, keys);
      }
      const claimed = new Set<string>();
      const assign = (action: ActionBinding, keys: string[]): void => {
        action.keys = keys.filter((key) => {
          if (claimed.has(key)) return false;
          claimed.add(key);
          return true;
        });
      };
      // Changed defaults get their new keys when the action was untouched.
      for (const id of ['pitchDown', 'scan', 'resetCamera'] as const) {
        const action = this.byId.get(id)!;
        if (!custom.has(id)) assign(action, action.keys);
      }
      for (const action of this.actions) {
        const keys = custom.get(action.id);
        if (keys) assign(action, keys);
      }
      for (const action of this.actions) {
        if (!custom.has(action.id) && !['pitchDown', 'scan', 'resetCamera'].includes(action.id))
          assign(action, action.keys);
      }
      if (version !== 3) this.saveBindings();
    } catch {
      /* A corrupt save leaves the defaults usable. */
    }
  }

  // ------------------------------------------------------------- listeners

  /** Enable or disable free mouse movement while the canvas holds pointer lock. */
  setMouseLook(enabled: boolean): void {
    this.mouseLook = enabled;
    if (!enabled) {
      this.state.lookDx = 0;
      this.state.lookDy = 0;
    }
  }

  attach(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes aimed at a text field (including a rebind capture box).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.repeat) return; // auto-repeat must not re-trigger edge actions
      this.keys.add(e.code);
      for (const action of this.actions) {
        if (action.keys.includes(e.code)) this.edgeArmed.add(action.id);
      }
      if (e.code === 'Space') this.edgeArmed.add('capturePhoto');
      // Swallow keys we consume so the page does not scroll -- but never Tab,
      // which the DOM overlays need for focus navigation.
      if (
        e.code !== 'Tab' &&
        // Enter (capture photo) must still activate focused menu buttons.
        e.code !== 'Enter' &&
        e.code !== 'NumpadEnter' &&
        !(e.ctrlKey && e.code === 'KeyW') &&
        (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) ||
          this.isBound(e.code))
      ) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
    const onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
      this.state.lookDx = 0;
      this.state.lookDy = 0;
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this.mouseDown = true;
    };
    const onMouseUp = () => {
      this.mouseDown = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      // Drag anywhere, or move freely once mouse-look is on (pointer lock).
      if (!this.mouseDown && !this.mouseLook) return;
      this.state.lookDx += e.movementX;
      this.state.lookDy += e.movementY;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    const el: HTMLElement | Window = this.target ?? window;
    el.addEventListener('mousedown', onMouseDown as EventListener);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    const onWheel = (e: WheelEvent) => {
      this.wheelDelta += e.deltaY;
      e.preventDefault();
    };
    this.target?.addEventListener('wheel', onWheel, { passive: false });

    this.disposers = [
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
      () => window.removeEventListener('blur', onBlur),
      () => el.removeEventListener('mousedown', onMouseDown as EventListener),
      () => window.removeEventListener('mouseup', onMouseUp),
      () => window.removeEventListener('mousemove', onMouseMove),
      () => this.target?.removeEventListener('wheel', onWheel),
    ];
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.keys.clear();
    this.edgeArmed.clear();
  }

  private isBound(code: string): boolean {
    return this.actions.some((a) => a.keys.includes(code));
  }

  /** True while any key bound to `id` is held. */
  isDown(id: ActionId): boolean {
    const keys = this.byId.get(id)?.keys;
    if (!keys) return false;
    for (const k of keys) if (this.keys.has(k)) return true;
    return false;
  }

  private axis(negative: ActionId, positive: ActionId): number {
    return (this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0);
  }

  /**
   * Inject a key press/release. Used by the Playwright playtest harness and by
   * unit tests; the real listeners funnel into the same two sets.
   */
  injectKey(code: string, down: boolean): void {
    if (down) {
      if (this.keys.has(code)) return;
      this.keys.add(code);
      for (const action of this.actions) {
        if (action.keys.includes(code)) this.edgeArmed.add(action.id);
      }
      if (code === 'Space') this.edgeArmed.add('capturePhoto');
    } else {
      this.keys.delete(code);
    }
  }

  // ---------------------------------------------------------------- sample

  /** Recompute the normalised state. Call once per frame, before physics. */
  sample(): InputState {
    const s = this.state;
    s.throttle = this.axis('thrustReverse', 'thrustForward');
    s.yaw = this.axis('yawPort', 'yawStarboard');
    s.pitch = this.axis('pitchDown', 'pitchUp');
    s.ballast = this.axis('ballastFlood', 'ballastBlow');
    s.boost = this.isDown('boost');
    s.scan = this.isDown('scan');

    if (this.edgeArmed.size) {
      if (this.edgeArmed.has('toggleCamera')) s.toggleCamera = true;
      if (this.edgeArmed.has('resetCamera')) s.resetCamera = true;
      if (this.edgeArmed.has('toggleSonar')) s.toggleSonar = true;
      if (this.edgeArmed.has('toggleLights')) s.toggleLights = true;
      if (this.edgeArmed.has('cycleSimSpeed')) s.cycleSimSpeed = true;
      if (this.edgeArmed.has('togglePhotoMode')) s.togglePhotoMode = true;
      if (this.edgeArmed.has('capturePhoto')) s.capturePhoto = true;
      if (this.edgeArmed.has('toggleJournal')) s.toggleGuide = true;
      if (this.edgeArmed.has('toggleGlobe')) s.toggleGlobe = true;
      if (this.edgeArmed.has('toggleRov')) s.toggleRov = true;
      this.edgeArmed.clear();
    }

    // Gamepad overrides whenever a stick or button is actually deflected.
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads?.();
    const pad = pads ? [...pads].find((p) => p?.connected) : null;
    this.gamepadActive = false;
    if (pad) {
      // W3C standard mapping: 0/1 left stick, 2/3 right stick.
      const [lx = 0, ly = 0, , ry = 0] = pad.axes;
      const yaw = applyDeadZone(lx);
      const throttle = applyDeadZone(-ly);
      const pitch = applyDeadZone(-ry);
      if (yaw) s.yaw = yaw;
      if (throttle) s.throttle = throttle;
      if (pitch) s.pitch = pitch;
      const up = pad.buttons[0]?.value ?? 0; // A / cross
      const down = pad.buttons[1]?.value ?? 0; // B / circle
      const ballast = applyDeadZone(up - down);
      if (ballast) s.ballast = ballast;
      if (pad.buttons[3]?.pressed) s.toggleCamera = true; // Y
      if (pad.buttons[2]?.pressed) s.toggleLights = true; // X
      s.scan = s.scan || (pad.buttons[5]?.pressed ?? false); // RB
      if (pad.buttons[8]?.pressed) s.toggleSonar = true; // Back / view
      if (pad.buttons[9]?.pressed) s.togglePhotoMode = true; // Start
      if (pad.buttons[12]?.pressed) s.cycleSimSpeed = true; // D-pad up
      s.boost = s.boost || (pad.buttons[7]?.value ?? 0) > 0.5; // RT
      this.gamepadActive = Boolean(yaw || throttle || pitch || ballast);
    }
    return s;
  }

  /** Clear per-frame edge/accumulated values. Call at the end of each frame. */
  endFrame(): void {
    const s = this.state;
    s.lookDx = 0;
    s.lookDy = 0;
    this.wheelDelta = 0;
    s.toggleCamera = false;
    s.resetCamera = false;
    s.toggleSonar = false;
    s.toggleLights = false;
    s.ping = false;
    s.cycleSimSpeed = false;
    s.togglePhotoMode = false;
    s.capturePhoto = false;
    s.toggleGuide = false;
    s.toggleGlobe = false;
    s.toggleRov = false;
  }
}

function safeStorage(): BindingStore | null {
  try {
    const ls = (globalThis as { localStorage?: BindingStore }).localStorage;
    return ls ?? null;
  } catch {
    // Accessing localStorage throws outright in some privacy modes.
    return null;
  }
}

/** `KeyW` -> `W`, `ShiftLeft` -> `Shift`, `ArrowUp` -> `Up`. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl';
  return code;
}
