/**
 * Quality tiers v2 (F0-CORE): picks the graphics tier at boot and scales the
 * pixel ratio at run time.
 *
 * - `detectTier(caps)` is a pure function over a `DeviceCaps` snapshot, so the
 *   heuristics are unit-tested without a browser (tests/unit/quality.test.ts).
 * - `readDeviceCaps(gl)` is the browser glue that fills that snapshot.
 * - `resolveQuality()` applies the precedence: `?tier=` beats the saved
 *   setting, and the saved setting beats detection unless it is `auto`.
 * - `DynamicResolution` lowers the pixel ratio in steps while the smoothed
 *   frame time stays over budget and raises it again when there is headroom.
 *
 * Heuristics, first match wins (docs/architecture.md "Phase F structure"):
 *   1. A software rasteriser (SwiftShader, llvmpipe, …) -> low.
 *   2. Tiny GPU limits (max texture < 4096) or ≤ 2 cores / ≤ 2 GB -> low.
 *   3. A phone (mobile UA or touch-only, short side < 600 CSS px) -> medium
 *      for a recent flagship GPU with ≥ 6 GB and ≥ 8 cores, else low.
 *   4. A tablet (mobile UA or touch-only, larger screen) -> medium, or low
 *      when it has ≤ 4 cores or ≤ 3 GB.
 *   5. A discrete desktop GPU (GeForce/RTX/Quadro, Radeon RX/Pro, Intel Arc,
 *      Apple M-series Pro/Max/Ultra) -> high.
 *   6. Old Intel HD graphics -> low; other integrated or unknown GPUs -> medium.
 * `ultra` is never picked automatically; players choose it.
 */

import {
  isGraphicsTier,
  type DynamicResolutionConfig,
  type GraphicsTier,
  type GraphicsTierSetting,
} from './Config.js';

/** Everything the tier heuristics look at. All fields are plain data. */
export interface DeviceCaps {
  /** Unmasked WebGL renderer string when available, else the masked one. */
  renderer: string;
  /** Unmasked WebGL vendor string when available. */
  vendor: string;
  maxTextureSize: number;
  /** `navigator.hardwareConcurrency`; null when the browser hides it. */
  cores: number | null;
  /** `navigator.deviceMemory` in GB (Chromium only, capped at 8); null when hidden. */
  memoryGb: number | null;
  /** User agent says mobile (`userAgentData.mobile` or a phone/tablet UA). */
  mobileUa: boolean;
  /** Touch is the primary input (coarse pointer, no hover). */
  touchPrimary: boolean;
  /** Screen size in CSS pixels. */
  screenW: number;
  screenH: number;
  devicePixelRatio: number;
}

export interface TierDecision {
  tier: GraphicsTier;
  /** One short human-readable reason, shown in `window.__game.quality`. */
  reason: string;
}

const SOFTWARE_RE = /swiftshader|llvmpipe|softpipe|software|basic render|lavapipe/i;
const DISCRETE_RE =
  /geforce|rtx|gtx|quadro|tesla|nvidia (a|l|t)\d|radeon (rx|pro|vii|r9)|radeon\(tm\) (rx|pro)|intel.*arc|arc\(tm\)|apple m\d+ (pro|max|ultra)/i;
const OLD_INTEL_RE = /intel.*\bhd graphics\b|intel\(r\) hd\b|gma/i;
/** Phone GPUs that hold a medium tier: recent Adreno, Mali-G7xx/Immortalis, Apple. */
const FLAGSHIP_MOBILE_RE =
  /adreno.*\b(7\d\d|8\d\d)\b|immortalis|mali-g7\d\d|mali-g(77|78)\b|apple gpu|apple a1[5-9]/i;

/** Pick a tier for a device. Pure; see the module header for the rules. */
export function detectTier(caps: DeviceCaps): TierDecision {
  const gpu = `${caps.vendor} ${caps.renderer}`.trim();
  if (SOFTWARE_RE.test(gpu)) return { tier: 'low', reason: 'software renderer' };
  if (caps.maxTextureSize > 0 && caps.maxTextureSize < 4096)
    return { tier: 'low', reason: 'small GPU limits' };
  if ((caps.cores !== null && caps.cores <= 2) || (caps.memoryGb !== null && caps.memoryGb <= 2))
    return { tier: 'low', reason: 'few cores or little memory' };

  const shortSide = Math.min(caps.screenW, caps.screenH);
  const handheld = caps.mobileUa || caps.touchPrimary;
  if (handheld && shortSide < 600) {
    const strong =
      FLAGSHIP_MOBILE_RE.test(gpu) &&
      (caps.memoryGb === null || caps.memoryGb >= 6) &&
      (caps.cores === null || caps.cores >= 8);
    return strong
      ? { tier: 'medium', reason: 'phone with a recent GPU' }
      : { tier: 'low', reason: 'phone' };
  }
  if (handheld) {
    const weak =
      (caps.cores !== null && caps.cores <= 4) || (caps.memoryGb !== null && caps.memoryGb <= 3);
    return weak ? { tier: 'low', reason: 'small tablet' } : { tier: 'medium', reason: 'tablet' };
  }

  if (DISCRETE_RE.test(gpu)) return { tier: 'high', reason: 'discrete GPU' };
  if (OLD_INTEL_RE.test(gpu)) return { tier: 'low', reason: 'older integrated GPU' };
  if (gpu === '') return { tier: 'medium', reason: 'unknown GPU' };
  return { tier: 'medium', reason: 'integrated or unrecognised GPU' };
}

/** Minimal slice of a WebGL context used by `readDeviceCaps`. */
export interface CapsGl {
  getParameter(pname: number): unknown;
  getExtension(name: string): unknown;
  readonly MAX_TEXTURE_SIZE: number;
  readonly RENDERER: number;
  readonly VENDOR: number;
}

// WEBGL_debug_renderer_info enums (stable across browsers).
const UNMASKED_VENDOR_WEBGL = 0x9245;
const UNMASKED_RENDERER_WEBGL = 0x9246;

/** Snapshot the device for `detectTier`. Never throws; unknowns become neutral values. */
export function readDeviceCaps(gl: CapsGl | null): DeviceCaps {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  const win = (globalThis as { window?: Window }).window;
  let renderer = '';
  let vendor = '';
  let maxTextureSize = 0;
  try {
    if (gl) {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(gl.getParameter(debug ? UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
      vendor = String(gl.getParameter(debug ? UNMASKED_VENDOR_WEBGL : gl.VENDOR) ?? '');
      maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0;
    }
  } catch {
    /* A lost or locked-down context: detection falls back to the other hints. */
  }
  const navExtra = nav as
    (Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } }) | undefined;
  const ua = nav?.userAgent ?? '';
  const mobileUa =
    navExtra?.userAgentData?.mobile === true ||
    /android|iphone|ipad|ipod|mobile|silk|kindle/i.test(ua) ||
    // iPadOS reports a desktop Safari UA; it still has touch points.
    (/macintosh/i.test(ua) && (nav?.maxTouchPoints ?? 0) > 1);
  let touchPrimary = false;
  try {
    touchPrimary =
      (nav?.maxTouchPoints ?? 0) > 0 &&
      win?.matchMedia?.('(pointer: coarse)').matches === true &&
      win?.matchMedia?.('(hover: none)').matches === true;
  } catch {
    touchPrimary = false;
  }
  return {
    renderer,
    vendor,
    maxTextureSize,
    cores: typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : null,
    memoryGb: typeof navExtra?.deviceMemory === 'number' ? navExtra.deviceMemory : null,
    mobileUa,
    touchPrimary,
    screenW: win?.screen?.width ?? win?.innerWidth ?? 0,
    screenH: win?.screen?.height ?? win?.innerHeight ?? 0,
    devicePixelRatio: win?.devicePixelRatio || 1,
  };
}

/** Where the tier for this dive came from. */
export type TierSource = 'url' | 'setting' | 'auto';

export interface QualityResolution {
  tier: GraphicsTier;
  source: TierSource;
  /** The saved setting at boot (`auto` or a tier). */
  setting: GraphicsTierSetting;
  /** What detection would pick, even when the URL or setting overrides it. */
  detected: TierDecision;
  reason: string;
}

/**
 * `?tier=` > saved fixed tier > detection (`auto`). `?tier=auto` forces
 * detection whatever the saved setting is.
 */
export function resolveQuality(
  urlTier: string | null,
  setting: GraphicsTierSetting,
  caps: DeviceCaps,
): QualityResolution {
  const detected = detectTier(caps);
  if (isGraphicsTier(urlTier))
    return { tier: urlTier, source: 'url', setting, detected, reason: '?tier= URL parameter' };
  if (urlTier === 'auto')
    return {
      tier: detected.tier,
      source: 'auto',
      setting,
      detected,
      reason: `?tier=auto: ${detected.reason}`,
    };
  if (setting !== 'auto')
    return { tier: setting, source: 'setting', setting, detected, reason: 'saved setting' };
  return { tier: detected.tier, source: 'auto', setting, detected, reason: detected.reason };
}

/**
 * Dynamic resolution controller. Feed it the real frame time every frame;
 * it returns a new pixel ratio when one should be applied, else null.
 *
 * Hysteresis: stepping down needs the smoothed frame time over
 * `budget x overBudgetFactor` for `downHoldS`; stepping up needs it under
 * `budget x headroomFactor` for `upHoldS`, and after each change the
 * controller waits `cooldownS`. If a step up is followed by a step down
 * within `4 x upHoldS`, the next step up waits twice as long (up to 60 s),
 * so an unstable ratio is not retried every few seconds.
 */
export class DynamicResolution {
  private ratio: number;
  private ema = 0;
  private overS = 0;
  private underS = 0;
  private cooldownS = 0;
  private upHoldS: number;
  private sinceUpS = Infinity;

  constructor(
    private readonly cfg: DynamicResolutionConfig,
    /** The tier's pixel ratio (device ratio under the tier cap): the ceiling. */
    readonly maxRatio: number,
  ) {
    this.ratio = maxRatio;
    this.upHoldS = cfg.upHoldS;
  }

  /** The pixel ratio currently in force. */
  get pixelRatio(): number {
    return this.ratio;
  }

  /** Smoothed frame time (ms). */
  get frameMs(): number {
    return this.ema;
  }

  /** Lowest ratio the controller will use. */
  get minRatio(): number {
    return Math.min(this.maxRatio, this.cfg.minPixelRatio);
  }

  /**
   * @param frameMs real time since the previous frame (ms)
   * @returns the new pixel ratio, or null when unchanged
   */
  update(frameMs: number): number | null {
    // A hidden tab or a debugger pause is not a slow frame.
    if (!(frameMs > 0) || frameMs > 250) return null;
    const dtS = frameMs / 1000;
    const k = 1 - Math.exp(-dtS / Math.max(1e-3, this.cfg.smoothingS));
    this.ema = this.ema === 0 ? frameMs : this.ema + (frameMs - this.ema) * k;
    this.sinceUpS += dtS;
    if (this.cooldownS > 0) {
      this.cooldownS -= dtS;
      return null;
    }
    const budget = this.cfg.budgetMs;
    if (this.ema > budget * this.cfg.overBudgetFactor) {
      this.overS += dtS;
      this.underS = 0;
    } else if (this.ema < budget * this.cfg.headroomFactor) {
      this.underS += dtS;
      this.overS = 0;
    } else {
      this.overS = 0;
      this.underS = 0;
    }
    if (this.overS >= this.cfg.downHoldS && this.ratio > this.minRatio + 1e-6) {
      if (this.sinceUpS < this.cfg.upHoldS * 4) this.upHoldS = Math.min(60, this.upHoldS * 2);
      return this.apply(Math.max(this.minRatio, this.ratio - this.cfg.step));
    }
    if (this.underS >= this.upHoldS && this.ratio < this.maxRatio - 1e-6) {
      this.sinceUpS = 0;
      return this.apply(Math.min(this.maxRatio, this.ratio + this.cfg.step));
    }
    return null;
  }

  private apply(next: number): number {
    this.ratio = Math.round(next * 100) / 100;
    this.overS = 0;
    this.underS = 0;
    this.cooldownS = this.cfg.cooldownS;
    return this.ratio;
  }
}
