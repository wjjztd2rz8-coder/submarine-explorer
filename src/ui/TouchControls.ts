/**
 * On-screen touch controls (F1-TOUCH): a left virtual stick (thrust and turn),
 * a right ballast slider (rise / sink), hold and tap buttons (Scan, Boost,
 * Lights, Sonar, Photo, Pause), drag-to-look, pinch zoom and double-tap to
 * reset the camera.
 *
 * Everything maps onto the existing {@link Input} (`touchAxes`, `touchHeld`,
 * `touchEdge`, `touchLook`, `touchZoom`), so gameplay code is unchanged.
 *
 * Visibility: the controls show while touch is the primary input. That is
 * decided at start from saved touch detection or media queries, then follows
 * the last input used, so a touch on a laptop shows them and a key press or
 * mouse click hides them again. `html.is-touch` is set with them so CSS (menus, settings)
 * can adapt; `src/styles/touch.css` holds all the styling.
 */

import type { Input } from '../core/Input.js';
import {
  classifyDevice,
  detectTouchPrimary,
  DoubleTap,
  isTap,
  pinchWheelDelta,
  rememberTouch,
  sliderAxis,
  stickAxes,
} from '../core/Touch.js';

export interface TouchControlsOptions {
  input: Input;
  canvas: HTMLElement;
  /** Open the pause menu. */
  onPause(): void;
  /** Sonar state for the pinch gesture: while expanded, pinch zooms the map. */
  sonar: { readonly expanded: boolean; zoomWheel(direction: number): unknown };
  parent?: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class TouchControls {
  readonly root: HTMLDivElement;
  private readonly input: Input;
  private readonly opts: TouchControlsOptions;
  private touchMode: boolean;
  private shouldShow = false;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private readonly sliderTrack: HTMLDivElement;
  private readonly sliderThumb: HTMLDivElement;
  private readonly rotateHint: HTMLDivElement;
  private readonly disposers: Array<() => void> = [];
  private stickPointer: number | null = null;
  private sliderPointer: number | null = null;
  private readonly heldPointers = new Map<number, 'scan' | 'boost'>();
  private hintShown = false;
  private hintTimer = 0;

  // Camera gestures on the canvas.
  private readonly looks = new Map<number, { x: number; y: number; t0: number; moved: number }>();
  private pinchDist = 0;
  private doubleTap = new DoubleTap();

  constructor(opts: TouchControlsOptions) {
    this.opts = opts;
    this.input = opts.input;
    this.touchMode = detectTouchPrimary();

    this.root = el('div', 'tc-root');
    this.root.hidden = true;
    this.root.setAttribute('aria-label', 'Touch controls');

    // Stick.
    this.stickBase = el('div', 'tc-stick');
    this.stickBase.setAttribute('aria-label', 'Thrust and turn stick');
    this.stickKnob = el('div', 'tc-stick-knob');
    this.stickBase.append(this.stickKnob);
    this.bindStick();

    // Ballast slider.
    this.sliderTrack = el('div', 'tc-slider');
    this.sliderTrack.setAttribute('aria-label', 'Rise and sink slider');
    this.sliderThumb = el('div', 'tc-slider-thumb');
    this.sliderTrack.append(
      el('span', 'tc-slider-tag tc-slider-up', 'RISE'),
      el('span', 'tc-slider-tag tc-slider-down', 'SINK'),
      this.sliderThumb,
    );
    this.bindSlider();

    // Buttons.
    const buttons = el('div', 'tc-buttons');
    buttons.append(
      this.holdButton('scan', 'SCAN', 'tc-btn-scan'),
      this.holdButton('boost', 'BOOST', 'tc-btn-boost'),
      this.tapButton('toggleLights', 'LIGHTS', 'tc-btn-lights'),
      this.tapButton('toggleSonar', 'SONAR', 'tc-btn-sonar'),
      this.tapButton('togglePhotoMode', 'PHOTO', 'tc-btn-photo'),
    );
    const pause = el('button', 'tc-btn tc-btn-pause');
    pause.type = 'button';
    pause.setAttribute('aria-label', 'Pause');
    pause.append(el('span', 'tc-pause-bar'), el('span', 'tc-pause-bar'));
    pause.addEventListener('click', () => this.opts.onPause());

    this.rotateHint = el('div', 'tc-rotate-hint', 'Rotate your phone for the best view');
    this.rotateHint.hidden = true;

    this.root.append(this.stickBase, this.sliderTrack, buttons, pause, this.rotateHint);
    (opts.parent ?? document.body).append(this.root);
    this.bindCamera();
    this.bindModeSwitch();
    // App switching and rotation can swallow pointerup; a stale centre must
    // never keep thrust or ballast engaged after the phone layout changes.
    const release = (): void => this.releaseAll();
    for (const event of ['blur', 'resize']) {
      window.addEventListener(event, release);
      this.disposers.push(() => window.removeEventListener(event, release));
    }
    const onVisibility = (): void => {
      if (document.hidden) release();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.disposers.push(() => document.removeEventListener('visibilitychange', onVisibility));
    this.applyMode();
  }

  /** True while the on-screen controls are the primary input. */
  get active(): boolean {
    return this.touchMode;
  }

  /** Force touch mode on or off (tests, `?touch=1`). */
  setTouchMode(on: boolean): void {
    if (this.touchMode === on) return;
    this.touchMode = on;
    this.applyMode();
  }

  /**
   * Called every frame. `inDive` is true during play (not paused, not behind a
   * menu); `photo` while photo mode frames a shot (controls stay hidden so the
   * frame is clear, look and pinch still work).
   */
  update(inDive: boolean, photo: boolean): void {
    const show = this.touchMode && inDive && !photo;
    if (show !== this.shouldShow) {
      this.shouldShow = show;
      this.root.hidden = !show;
      if (!show) this.releaseAll();
      else this.maybeShowRotateHint();
    }
    if (show) this.root.classList.toggle('tc-sonar-open', this.opts.sonar.expanded);
  }

  dispose(): void {
    window.clearTimeout(this.hintTimer);
    for (const d of this.disposers) d();
    this.disposers.length = 0;
    this.releaseAll();
    this.input.touchActive = false;
    document.documentElement.classList.remove('is-touch');
    this.root.remove();
  }

  // ---------------------------------------------------------------- mode

  private applyMode(): void {
    if (this.touchMode) rememberTouch();
    this.input.touchActive = this.touchMode;
    document.documentElement.classList.toggle('is-touch', this.touchMode);
    if (!this.touchMode) this.releaseAll();
  }

  /** Follow the last input used: touch shows the controls, keys and mouse hide them. */
  private bindModeSwitch(): void {
    const on = <K extends keyof WindowEventMap>(
      type: K,
      fn: (e: WindowEventMap[K]) => void,
      capture = true,
    ): void => {
      window.addEventListener(type, fn, capture);
      this.disposers.push(() => window.removeEventListener(type, fn, capture));
    };
    on('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.setTouchMode(true);
      } else if (e.pointerType === 'mouse' && this.touchMode) {
        this.setTouchMode(false);
      }
    });
    on('keydown', (e) => {
      if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(e.code)) return;
      if (this.touchMode) this.setTouchMode(false);
    });
    // Rotation moves the controls beneath held fingers. Start the next gesture
    // from the new geometry rather than retaining thrust or old look positions.
    const resetLayout = (): void => {
      this.releaseAll();
      if (window.innerHeight <= window.innerWidth) {
        this.rotateHint.hidden = true;
        window.clearTimeout(this.hintTimer);
      } else if (this.shouldShow) this.maybeShowRotateHint();
    };
    on('resize', resetLayout);
    on('orientationchange', resetLayout);
  }

  // --------------------------------------------------------------- stick

  private bindStick(): void {
    const base = this.stickBase;
    const centre = { x: 0, y: 0, r: 1 };
    const move = (e: PointerEvent): void => {
      const max = centre.r;
      let dx = e.clientX - centre.x;
      let dy = e.clientY - centre.y;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      this.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      const a = stickAxes(dx, dy, max);
      this.input.touchAxes.throttle = a.throttle;
      this.input.touchAxes.yaw = a.yaw;
    };
    base.addEventListener('pointerdown', (e) => {
      if (this.stickPointer !== null) return;
      e.preventDefault();
      this.stickPointer = e.pointerId;
      base.setPointerCapture(e.pointerId);
      const r = base.getBoundingClientRect();
      centre.x = r.left + r.width / 2;
      centre.y = r.top + r.height / 2;
      centre.r = r.width / 2 - this.stickKnob.offsetWidth * 0.25;
      base.classList.add('is-held');
      move(e);
    });
    base.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.stickPointer) move(e);
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== this.stickPointer) return;
      this.releaseStick();
    };
    base.addEventListener('pointerup', end);
    base.addEventListener('pointercancel', end);
    base.addEventListener('lostpointercapture', end);
  }

  private releaseStick(): void {
    this.stickPointer = null;
    this.stickKnob.style.transform = '';
    this.stickBase.classList.remove('is-held');
    this.input.touchAxes.throttle = 0;
    this.input.touchAxes.yaw = 0;
  }

  // -------------------------------------------------------------- slider

  private bindSlider(): void {
    const track = this.sliderTrack;
    const move = (e: PointerEvent): void => {
      const r = track.getBoundingClientRect();
      const t = (e.clientY - r.top) / r.height;
      const clamped = Math.min(1, Math.max(0, t));
      const half = this.sliderThumb.offsetHeight / 2;
      this.sliderThumb.style.top = `${clamped * (r.height - 2 * half) + half}px`;
      this.input.touchAxes.ballast = sliderAxis(t);
    };
    track.addEventListener('pointerdown', (e) => {
      if (this.sliderPointer !== null) return;
      e.preventDefault();
      this.sliderPointer = e.pointerId;
      track.setPointerCapture(e.pointerId);
      track.classList.add('is-held');
      move(e);
    });
    track.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.sliderPointer) move(e);
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId !== this.sliderPointer) return;
      this.releaseSlider();
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('lostpointercapture', end);
  }

  /** The thumb springs back to neutral, like the stick. */
  private releaseSlider(): void {
    this.sliderPointer = null;
    this.sliderThumb.style.top = '';
    this.sliderTrack.classList.remove('is-held');
    this.input.touchAxes.ballast = 0;
  }

  // ------------------------------------------------------------- buttons

  private holdButton(id: 'scan' | 'boost', label: string, cls: string): HTMLButtonElement {
    const b = el('button', `tc-btn ${cls}`, label);
    b.type = 'button';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      this.heldPointers.set(e.pointerId, id);
      b.classList.add('is-held');
      this.input.touchHeld.add(id);
    });
    const end = (e: PointerEvent): void => {
      if (this.heldPointers.get(e.pointerId) !== id) return;
      this.heldPointers.delete(e.pointerId);
      // Releasing a second finger must not cancel the first finger's scan.
      if ([...this.heldPointers.values()].includes(id)) return;
      b.classList.remove('is-held');
      this.input.touchHeld.delete(id);
    };
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    b.addEventListener('lostpointercapture', end);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  private tapButton(
    id: 'toggleLights' | 'toggleSonar' | 'togglePhotoMode',
    label: string,
    cls: string,
  ): HTMLButtonElement {
    const b = el('button', `tc-btn ${cls}`, label);
    b.type = 'button';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.classList.add('is-held');
      this.input.touchEdge(id);
    });
    const end = (): void => b.classList.remove('is-held');
    b.addEventListener('pointerup', end);
    b.addEventListener('pointercancel', end);
    b.addEventListener('pointerleave', end);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  }

  // -------------------------------------------------------------- camera

  /** Drag to look, two fingers to pinch, double-tap to reset (all on the view). */
  private bindCamera(): void {
    const canvas = this.opts.canvas;
    canvas.style.touchAction = 'none';
    const accepts = (target: EventTarget | null): boolean => {
      if (target === canvas) return true;
      // While the sonar map is expanded a pinch on it zooms the map.
      return (
        this.opts.sonar.expanded &&
        target instanceof HTMLElement &&
        target.closest('.sonar, .d-sonar-backdrop') !== null
      );
    };
    const pair = (): [{ x: number; y: number }, { x: number; y: number }] | null => {
      const it = [...this.looks.values()];
      return it.length >= 2 ? [it[0]!, it[1]!] : null;
    };
    const dist = (): number => {
      const p = pair();
      return p ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
    };
    const down = (e: PointerEvent): void => {
      if (e.pointerType !== 'touch' || !accepts(e.target)) return;
      this.looks.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        t0: performance.now(),
        moved: 0,
      });
      if (this.looks.size === 2) this.pinchDist = dist();
    };
    const move = (e: PointerEvent): void => {
      const p = this.looks.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      p.moved += Math.abs(dx) + Math.abs(dy);
      if (this.looks.size >= 2) {
        const d = dist();
        const delta = pinchWheelDelta(this.pinchDist, d);
        this.pinchDist = d;
        if (this.opts.sonar.expanded) {
          if (Math.abs(delta) > 14) this.opts.sonar.zoomWheel(delta < 0 ? -1 : 1);
        } else this.input.touchZoom(delta);
      } else if (!this.opts.sonar.expanded) {
        this.input.touchLook(dx, dy);
      }
    };
    const up = (e: PointerEvent): void => {
      const p = this.looks.get(e.pointerId);
      if (!p) return;
      this.looks.delete(e.pointerId);
      this.pinchDist = dist();
      if (
        e.type === 'pointerup' &&
        this.looks.size === 0 &&
        e.target === canvas &&
        isTap(performance.now() - p.t0, p.moved) &&
        this.doubleTap.tap(performance.now(), e.clientX, e.clientY)
      ) {
        this.input.touchEdge('resetCamera');
      }
    };
    const w: Array<[string, (e: PointerEvent) => void]> = [
      ['pointerdown', down],
      ['pointermove', move],
      ['pointerup', up],
      ['pointercancel', up],
    ];
    for (const [type, fn] of w) {
      window.addEventListener(type, fn as EventListener);
      this.disposers.push(() => window.removeEventListener(type, fn as EventListener));
    }
  }

  // ------------------------------------------------------------- helpers

  private releaseAll(): void {
    this.releaseStick();
    this.releaseSlider();
    this.input.touchHeld.clear();
    this.heldPointers.clear();
    this.looks.clear();
    this.pinchDist = 0;
    // A tap before a layout/mode interruption cannot pair with the next gesture.
    this.doubleTap = new DoubleTap();
    for (const b of this.root.querySelectorAll('.is-held')) b.classList.remove('is-held');
  }

  /** A gentle portrait hint on phones; play stays possible. */
  private maybeShowRotateHint(): void {
    if (this.hintShown) return;
    const cls = classifyDevice(true, screen.width, screen.height);
    if (cls !== 'phone' || window.innerHeight <= window.innerWidth) return;
    this.hintShown = true;
    this.rotateHint.hidden = false;
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      this.rotateHint.hidden = true;
    }, 6000);
    this.rotateHint.addEventListener('pointerdown', () => (this.rotateHint.hidden = true), {
      once: true,
    });
  }
}
