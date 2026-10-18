import { DEFAULT_CONFIG, type GameConfig, type GameplayOptions } from '../core/Config.js';
import type { CurrentMode } from '../core/config/modes.js';
import { PROGRESS_CONFIG, EQUIPMENT } from '../core/config/progress.js';
import type { GameplayMode, SettingsData } from '../core/Save.js';
import type { DailyDive } from './Daily.js';

/** Resolve from pristine tuning every time, so modes, equipment and Daily never compound. */
export function resolveEffective(
  settings: SettingsData,
  mode: GameplayMode,
  daily: Pick<DailyDive, 'modifier'> | null,
  base: GameConfig = DEFAULT_CONFIG,
) {
  const preset = mode === 'custom' ? settings.gameplayBaseMode : mode;
  const gameplay: GameplayOptions = {
    ...(mode === 'custom' ? settings.gameplay : base.settings.gameplayPresets[preset]),
  };
  const speedName: 'research' | 'fast' = preset === 'realistic' ? 'research' : 'fast';
  const profile = base.speedProfiles[speedName];
  const speed = {
    ...profile,
    thrustAccel: profile.thrustAccel * EQUIPMENT.thrust ** 2,
    maxSpeed: profile.maxSpeed * EQUIPMENT.thrust,
    cruiseSpeed: profile.cruiseSpeed * EQUIPMENT.thrust,
    yawRate: profile.yawRate * EQUIPMENT.turn,
    reverseAccel: profile.reverseAccel * EQUIPMENT.reverse,
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
    power[key] *= EQUIPMENT.battery;
  power.oxygenHours *= EQUIPMENT.oxygen;
  power.boostCostMultiplier /= EQUIPMENT.boostEfficiency;
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
      radiusFloorM: preset === 'realistic' ? 0 : 100,
      hintRangeFactor:
        base.scan.hintRangeFactor * sensor.hintRangeMultiplier * EQUIPMENT.scanDetail,
    },
    power,
    light: {
      ...light,
      distance: light.distance * EQUIPMENT.lightRange,
      angleDeg: light.angleDeg + EQUIPMENT.beamDegrees,
    },
    sensor: {
      ...sensor,
      sonarPoiRange: sensor.sonarPoiRange * EQUIPMENT.sonarRange,
      scanRadiusMultiplier: sensor.scanRadiusMultiplier * EQUIPMENT.scanDetail,
      hintRangeMultiplier: sensor.hintRangeMultiplier * EQUIPMENT.scanDetail,
    },
    boostSeconds: PROGRESS_CONFIG.boostSeconds,
  };
}
export type EffectiveSettings = ReturnType<typeof resolveEffective>;
