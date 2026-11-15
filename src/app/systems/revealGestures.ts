/**
 * Reveal look-around: one finger or a mouse drag on the 3D view orbits the
 * reveal camera, two fingers pinch and the wheel zoom. Gestures are buffered
 * and applied once per frame so the reveal system can take its journal still
 * from the authored framing before the player moves the camera.
 */

/** Radians of orbit per CSS pixel dragged. */
export const REVEAL_DRAG_RAD_PER_PX = 0.0055;
/** Seconds after the last drag before the reveal's auto-close countdown resumes. */
export const REVEAL_DRAG_GRACE_S = 3;

export interface RevealOrbitTarget {
  revealOrbit(dAzimuth: number, dElevation: number): boolean;
  revealZoom(factor: number): boolean;
  revealRelease(vAzimuth?: number, vElevation?: number): void;
}

interface Pointer {
  x: number;
  y: number;
}

export class RevealGestures {
  private readonly pointers = new Map<number, Pointer>();
  private pinchDist = 0;
  private dAzimuth = 0;
  private dElevation = 0;
  private zoom = 1;
  private release: { vAzimuth: number; vElevation: number } | null = null;
  /** Recent drag velocity (rad/s), for the fling on release. */
  private vAzimuth = 0;
  private vElevation = 0;
  private lastMoveAt = 0;
  private readonly offs: Array<() => void> = [];
  /** Seconds since the last gesture input (Infinity before the first). */
  sinceInput = Infinity;
  /** Any input since this reveal began. */
  used = false;

  constructor(
    private readonly canvas: HTMLElement,
    private readonly active: () => boolean,
    private readonly now: () => number = () => performance.now(),
  ) {
    const on = <E extends Event>(
      target: EventTarget,
      type: string,
      fn: (e: E) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(type, fn as EventListener, opts);
      this.offs.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };
    on<PointerEvent>(canvas, 'pointerdown', (e) => this.down(e));
    on<PointerEvent>(window, 'pointermove', (e) => this.move(e));
    on<PointerEvent>(window, 'pointerup', (e) => this.up(e));
    on<PointerEvent>(window, 'pointercancel', (e) => this.up(e));
    on<WheelEvent>(canvas, 'wheel', (e) => this.wheel(e), { passive: false });
    on(window, 'blur', () => {
      const held = this.dragging;
      this.reset();
      // Focus can leave without delivering pointerup; stop the camera's held drag too.
      if (held) this.release = { vAzimuth: 0, vElevation: 0 };
    });
  }

  /** A finger or button is down on the view. */
  get dragging(): boolean {
    return this.pointers.size > 0;
  }

  /** Buffered input not yet applied to the camera. */
  get pending(): boolean {
    return this.dAzimuth !== 0 || this.dElevation !== 0 || this.zoom !== 1 || !!this.release;
  }

  /** Apply buffered input to the rig; call once per frame. */
  flush(rig: RevealOrbitTarget): void {
    if (this.dAzimuth !== 0 || this.dElevation !== 0)
      rig.revealOrbit(this.dAzimuth, this.dElevation);
    if (this.zoom !== 1) rig.revealZoom(this.zoom);
    if (this.release) rig.revealRelease(this.release.vAzimuth, this.release.vElevation);
    this.dAzimuth = 0;
    this.dElevation = 0;
    this.zoom = 1;
    this.release = null;
  }

  /** Advance the idle clock (seconds of unblocked reveal time). */
  tick(dt: number): void {
    if (this.dragging) this.sinceInput = 0;
    else this.sinceInput += dt;
  }

  /** Forget any held gesture (reveal ended or a new one begins). */
  reset(): void {
    for (const id of this.pointers.keys()) {
      try {
        if (this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id);
      } catch {
        /* The pointer may already be gone. */
      }
    }
    this.pointers.clear();
    this.pinchDist = 0;
    this.dAzimuth = 0;
    this.dElevation = 0;
    this.zoom = 1;
    this.release = null;
    this.sinceInput = Infinity;
    this.used = false;
  }

  dispose(): void {
    this.reset();
    for (const off of this.offs.splice(0)) off();
  }

  private touched(): void {
    this.sinceInput = 0;
    this.used = true;
  }

  private down(e: PointerEvent): void {
    if (!this.active() || e.target !== this.canvas) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      this.canvas.setPointerCapture?.(e.pointerId);
    } catch {
      /* Synthetic pointers cannot be captured. */
    }
    if (e.pointerType === 'mouse') e.preventDefault();
    this.vAzimuth = 0;
    this.vElevation = 0;
    this.lastMoveAt = this.now();
    this.pinchDist = this.pinchDistance();
  }

  private move(e: PointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    if (!this.active()) {
      this.reset();
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (dx === 0 && dy === 0) return;
    this.touched();
    if (this.pointers.size >= 2) {
      const d = this.pinchDistance();
      if (this.pinchDist > 0 && d > 0) this.zoom *= this.pinchDist / d;
      this.pinchDist = d;
      this.vAzimuth = 0;
      this.vElevation = 0;
      return;
    }
    // Same sense as the dive's drag-to-look: the subject turns with the finger.
    const da = -dx * REVEAL_DRAG_RAD_PER_PX;
    const de = dy * REVEAL_DRAG_RAD_PER_PX;
    this.dAzimuth += da;
    this.dElevation += de;
    const t = this.now();
    const dt = Math.max(0.004, (t - this.lastMoveAt) / 1000);
    this.lastMoveAt = t;
    // Smoothed velocity so a single jittery event does not decide the fling.
    this.vAzimuth = this.vAzimuth * 0.5 + (da / dt) * 0.5;
    this.vElevation = this.vElevation * 0.5 + (de / dt) * 0.5;
  }

  private up(e: PointerEvent): void {
    if (!this.pointers.delete(e.pointerId)) return;
    this.pinchDist = this.pinchDistance();
    if (this.pointers.size > 0) {
      // Lifting one finger of a pinch should not jump: restart the drag from the rest.
      this.vAzimuth = 0;
      this.vElevation = 0;
      return;
    }
    this.touched();
    // A finger that stopped before lifting does not fling.
    const still = this.now() - this.lastMoveAt > 80;
    this.release = still
      ? { vAzimuth: 0, vElevation: 0 }
      : { vAzimuth: this.vAzimuth, vElevation: this.vElevation };
    this.vAzimuth = 0;
    this.vElevation = 0;
  }

  private wheel(e: WheelEvent): void {
    if (!this.active()) return;
    e.preventDefault();
    const px = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    this.zoom *= Math.exp(Math.max(-200, Math.min(200, px)) * 0.0015);
    this.touched();
  }

  private pinchDistance(): number {
    const it = [...this.pointers.values()];
    return it.length >= 2 ? Math.hypot(it[0]!.x - it[1]!.x, it[0]!.y - it[1]!.y) : 0;
  }
}
