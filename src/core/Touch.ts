/**
 * Touch input maths and device detection (F1-TOUCH), unit-tested in
 * tests/unit/touch.test.ts. `ui/TouchControls.ts` feeds them pointer events and
 * writes the results into `Input.touchAxes` / `Input.touchLook` / `touchZoom`.
 */

/** Fraction of the stick radius that reads as zero (thumbs are never still). */
export const STICK_DEAD_ZONE = 0.12;

export interface StickAxes {
  /** -1 (reverse) .. +1 (ahead). */
  throttle: number;
  /** -1 (port) .. +1 (starboard). */
  yaw: number;
}

/**
 * Turn a thumb offset from the stick centre (CSS px, y grows downward) into
 * throttle and yaw. The offset is clamped to `radius`, the dead zone is
 * removed and the rest is rescaled so a full deflection still reaches 1.
 */
export function stickAxes(dx: number, dy: number, radius: number): StickAxes {
  if (!(radius > 0)) return { throttle: 0, yaw: 0 };
  let x = dx / radius;
  let y = dy / radius;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  const mag = Math.min(1, len);
  if (mag < STICK_DEAD_ZONE) return { throttle: 0, yaw: 0 };
  const k = (mag - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE) / mag;
  return { yaw: clamp1(x * k), throttle: clamp1(-y * k) };
}

/** Ballast slider: `t` runs 0 (top, surface) .. 1 (bottom, dive); the middle is neutral. */
export function sliderAxis(t: number): number {
  const v = (0.5 - Math.min(1, Math.max(0, t))) * 2;
  return Math.abs(v) < 0.14 ? 0 : clamp1(v);
}

function clamp1(v: number): number {
  return Math.max(-1, Math.min(1, v));
}

/** Detects two quick, close taps. Feed it every tap; it returns true on the second. */
export class DoubleTap {
  private lastMs = -Infinity;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private readonly windowMs = 320,
    private readonly slopPx = 40,
  ) {}

  tap(nowMs: number, x: number, y: number): boolean {
    const hit =
      nowMs - this.lastMs <= this.windowMs &&
      Math.hypot(x - this.lastX, y - this.lastY) <= this.slopPx;
    if (hit) this.lastMs = -Infinity;
    else {
      this.lastMs = nowMs;
      this.lastX = x;
      this.lastY = y;
    }
    return hit;
  }
}

/**
 * Pinch: returns the wheel-style zoom delta for a change of finger distance.
 * Fingers moving apart (zoom in) give a negative delta, like a wheel scrolled up.
 */
export function pinchWheelDelta(prevDist: number, nextDist: number): number {
  if (!(prevDist > 0) || !(nextDist > 0)) return 0;
  return (prevDist - nextDist) * 4;
}

/** A tap is a short press that barely moved. */
export function isTap(durationMs: number, movedPx: number): boolean {
  return durationMs < 280 && movedPx < 14;
}

export type DeviceClass = 'phone' | 'tablet' | 'desktop';

/** Classify by screen short side once the device is known to be touch-first. */
export function classifyDevice(
  touchPrimary: boolean,
  screenW: number,
  screenH: number,
): DeviceClass {
  if (!touchPrimary) return 'desktop';
  return Math.min(screenW, screenH) < 600 ? 'phone' : 'tablet';
}

/** localStorage key remembering that this device has been used by touch. */
export const TOUCH_SEEN_KEY = 'subexplorer.touch.v1';

/** Remember detected or forced touch mode for the next game boot. Storage is optional. */
export function rememberTouch(): void {
  try {
    localStorage.setItem(TOUCH_SEEN_KEY, '1');
  } catch {
    /* Optional. */
  }
}

/** Touch was previously used, or is the primary coarse pointer without hover. */
export function detectTouchPrimary(): boolean {
  try {
    if (localStorage.getItem(TOUCH_SEEN_KEY) === '1') return true;
  } catch {
    /* Detection still works when storage is unavailable. */
  }
  try {
    const nav = navigator;
    return (
      (nav.maxTouchPoints ?? 0) > 0 &&
      window.matchMedia('(pointer: coarse)').matches &&
      window.matchMedia('(hover: none)').matches
    );
  } catch {
    return false;
  }
}
