/** Optional dive supplies. All time here is simulated time at 1×. */
import type { DescentProfile, PowerConfig } from '../core/Config.js';

export type Supply = 'battery' | 'oxygen';
export interface PowerState {
  enabled: boolean;
  battery: number;
  oxygen: number;
  low: Supply[];
  critical: Supply[];
  depleted: Supply | null;
}

export interface PowerLoad {
  throttle: number;
  ballast: number;
  boost: boolean;
  lights: boolean;
  sensors: boolean;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** Simulated descent with half ballast duty, lights on, and a 3% maneuver margin. */
export function startingReserves(
  depthM: number,
  profile: DescentProfile,
  config: PowerConfig,
): { battery: number; oxygen: number; descentSeconds: number } {
  const depth = Math.max(0, Number.isFinite(depthM) ? depthM : 0);
  if (depth === 0) return { battery: 1, oxygen: 1, descentSeconds: 0 };
  const descentSeconds = depth / profile.maxVerticalSpeed;
  const margin = 1.03;
  const batteryRate =
    1 / config.batteryIdleHours + 0.5 / config.batteryThrustHours + 1 / config.batteryLightsHours;
  return {
    battery: clamp01(1 - (descentSeconds * margin * batteryRate) / 3600),
    oxygen: clamp01(1 - (descentSeconds * margin) / (config.oxygenHours * 3600)),
    descentSeconds,
  };
}

export class Power {
  private battery = 1;
  private oxygen = 1;
  private enabled: boolean;

  constructor(
    private readonly config: PowerConfig,
    enabled = false,
  ) {
    this.enabled = enabled;
  }

  /** A live mode change preserves supplies. Turning off hides and freezes them. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  reset(): void {
    this.battery = 1;
    this.oxygen = 1;
  }

  /** Fixed simulated seconds only; callers pass zero while paused. */
  step(dt: number, load: PowerLoad): Supply | null {
    if (!this.enabled || !Number.isFinite(dt) || dt <= 0) return null;
    const c = this.config;
    const thrust = Math.max(clamp01(Math.abs(load.throttle)), clamp01(Math.abs(load.ballast)));
    const batteryRate =
      1 / (c.batteryIdleHours * 3600) +
      (thrust * (load.boost ? c.boostCostMultiplier : 1)) / (c.batteryThrustHours * 3600) +
      (load.lights ? 1 / (c.batteryLightsHours * 3600) : 0) +
      (load.sensors ? 1 / (c.batterySensorsHours * 3600) : 0);
    this.battery = clamp01(this.battery - dt * batteryRate);
    this.oxygen = clamp01(this.oxygen - dt / (c.oxygenHours * 3600));
    return this.battery <= 0 ? 'battery' : this.oxygen <= 0 ? 'oxygen' : null;
  }

  /** Deterministic test hook; fractions are clamped like normal depletion. */
  setLevels(battery: number, oxygen: number): void {
    if (Number.isFinite(battery)) this.battery = clamp01(battery);
    if (Number.isFinite(oxygen)) this.oxygen = clamp01(oxygen);
  }

  get state(): PowerState {
    const low: Supply[] = [];
    const critical: Supply[] = [];
    if (this.battery <= this.config.lowThreshold) low.push('battery');
    if (this.oxygen <= this.config.lowThreshold) low.push('oxygen');
    if (this.battery <= this.config.criticalThreshold) critical.push('battery');
    if (this.oxygen <= this.config.criticalThreshold) critical.push('oxygen');
    return {
      enabled: this.enabled,
      battery: this.battery,
      oxygen: this.oxygen,
      low,
      critical,
      depleted: this.battery <= 0 ? 'battery' : this.oxygen <= 0 ? 'oxygen' : null,
    };
  }
}
