import { clamp } from '../util/math.js';
import { DEFAULT_CONFIG, type GameConfig, type GameplayOptions } from '../core/Config.js';
import type { CurrentMode } from '../core/config/modes.js';
import { PROGRESS_CONFIG, UPGRADES, type UpgradeId } from '../core/config/progress.js';
import type { GameplayMode, ProgressRecord, SettingsData } from '../core/Save.js';
import type { DailyDive } from './Daily.js';

/** Resolve from pristine tuning every time, so modes, purchases and Daily never compound. */
export function resolveEffective(
  settings: SettingsData,
  mode: GameplayMode,
  progress: Pick<ProgressRecord, 'upgrades'>,
  daily: Pick<DailyDive, 'modifier'> | null,
  base: GameConfig = DEFAULT_CONFIG,
) {
  const preset = mode === 'custom' ? settings.gameplayBaseMode : mode;
  const gameplay: GameplayOptions = {
    ...(mode === 'custom' ? settings.gameplay : base.settings.gameplayPresets[preset]),
  };
  const level = (id: UpgradeId) => {
    const upgrade = UPGRADES.find((u) => u.id === id)!;
    return clamp(progress.upgrades[id] ?? 0, 0, upgrade.costs.length);
  };
  const factor = (id: UpgradeId) => 1 + level(id) * UPGRADES.find((u) => u.id === id)!.step;
  const speedName: 'research' | 'fast' = preset === 'realistic' ? 'research' : 'fast';
  const profile = base.speedProfiles[speedName];
  const speed = {
    ...profile,
    thrustAccel: profile.thrustAccel * factor('thrust') ** 2,
    maxSpeed: profile.maxSpeed * factor('thrust'),
    cruiseSpeed: profile.cruiseSpeed * factor('thrust'),
    yawRate: profile.yawRate * factor('turn'),
    reverseAccel: profile.reverseAccel * factor('reverse'),
  };
  const light =
    base.lightPresets[
      preset === 'realistic' || daily?.modifier === 'low-light' ? 'realistic' : 'enhanced'
    ];
  const sensor = base.sensorPresets[preset === 'realistic' ? 'realistic' : 'extended'];
  const power = { ...base.power };
  for (const key of [
    'batteryIdleHours',
    'batteryThrustHours',
    'batteryLightsHours',
    'batterySensorsHours',
  ] as const)
    power[key] *= factor('battery');
  power.oxygenHours *= factor('oxygen');
  power.boostCostMultiplier /= factor('boost');
  const currentMode: CurrentMode = daily
    ? daily.modifier === 'strong-currents'
      ? 'strong'
      : 'off'
    : gameplay.currents;
  return {
    gameplay,
    currentMode,
    speedName,
    submarine: { ...base.submarine, ...speed },
    camera: { ...base.camera, lookAheadPerSpeed: speed.cameraLookAheadPerSpeed },
    scan: {
      ...base.scan,
      hintRangeFactor:
        base.scan.hintRangeFactor * sensor.hintRangeMultiplier * factor('sonar-detail'),
    },
    power,
    light: {
      ...light,
      distance: light.distance * factor('light-range'),
      angleDeg:
        light.angleDeg + level('light-beam') * UPGRADES.find((u) => u.id === 'light-beam')!.step,
    },
    sensor: {
      ...sensor,
      sonarPoiRange: sensor.sonarPoiRange * factor('sonar-range'),
      scanRadiusMultiplier: sensor.scanRadiusMultiplier * factor('sonar-detail'),
      hintRangeMultiplier: sensor.hintRangeMultiplier * factor('sonar-detail'),
    },
    boostSeconds: PROGRESS_CONFIG.boostSeconds * factor('boost'),
  };
}
export type EffectiveSettings = ReturnType<typeof resolveEffective>;
