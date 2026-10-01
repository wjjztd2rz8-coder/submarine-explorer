import { describe, expect, it } from 'vitest';
import { PointLight, SpotLight, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { Headlights } from '../../src/render/Headlights.js';
import { RovVisual } from '../../src/rov/RovVisual.js';

const origin = new Vector3(0, -3800, 0);
const forward = new Vector3(0, 0, -1);

function rig() {
  const config = makeConfig();
  const lights = new Headlights(config.water, config.water.tiers.medium);
  lights.setPreset(config.lightPresets.enhanced);
  return { config, lights };
}

describe('ROV work lighting', () => {
  it('preserves the ROV model lamps as well as the shared rig', () => {
    const config = makeConfig();
    const visual = new RovVisual(config.rov, 'medium');
    try {
      visual.setLightPreset(config.lightPresets.enhanced);
      const spots: SpotLight[] = [];
      const fills: PointLight[] = [];
      visual.group.traverse((object) => {
        if (object instanceof SpotLight) spots.push(object);
        if (object instanceof PointLight) fills.push(object);
      });
      expect(spots).toHaveLength(2);
      for (const spot of spots) {
        expect(spot.intensity).toBeCloseTo(1800 * 0.45 * 1.25);
        expect(spot.decay).toBe(2);
      }
      expect(fills).toHaveLength(1);
      expect(fills[0].intensity).toBeCloseTo(160 * 0.6 * 3 * 1.25);
      expect(fills[0].decay).toBe(2);
    } finally {
      visual.dispose();
    }
  });
  it('preserves the established broad work pool after exposure and close-light reductions', () => {
    const { lights } = rig();
    try {
      lights.update(origin, forward, undefined, 0, 1, 0.3);
      // Previous work lamps were inverse-linear at 1800, fill 160, exposure 1.25.
      // At exposure 1.0 the same scene irradiance needs that 1.25 gain in the lamps.
      for (const lamp of lights.lights) {
        expect(lamp.decay).toBe(1);
        expect(lamp.penumbra).toBe(0.6);
        expect(lamp.angle).toBeCloseTo((52 * Math.PI) / 180);
        for (const distance of [15, 40, 52])
          expect(lamp.intensity / distance ** lamp.decay).toBeCloseTo((1800 * 1.25) / distance);
      }
      expect(lights.fill.decay).toBe(1);
      expect(lights.fill.intensity).toBe(160 * 1.25);
      expect(lights.fill.distance).toBe(350);
    } finally {
      lights.dispose();
    }
  });

  it('restores close-light tuning on retrieval, including retrieval with lights off', () => {
    const { config, lights } = rig();
    try {
      lights.update(origin, forward, undefined, 0, 1, 0.3);
      lights.setEnabled(false);
      lights.update(origin, forward);
      lights.setEnabled(true);
      for (const lamp of lights.lights) {
        expect(lamp.intensity).toBe(config.lightPresets.enhanced.intensity);
        expect(lamp.decay).toBe(1.35);
        expect(lamp.penumbra).toBe(0.7);
        expect(lamp.angle).toBeCloseTo((36 * Math.PI) / 180);
      }
      expect(lights.fill.intensity).toBe(50);
      expect(lights.fill.decay).toBe(2);
      expect(lights.fill.visible).toBe(true);
    } finally {
      lights.dispose();
    }
  });

  it('keeps live presets and research gains while the ROV is deployed', () => {
    const { config, lights } = rig();
    try {
      lights.update(origin, forward, undefined, 0, 1, 0.3);
      lights.setPreset(config.lightPresets.realistic);
      expect(lights.lights[0].intensity).toBe(1100 * 1.25);
      expect(lights.lights[0].angle).toBeCloseTo((38 * Math.PI) / 180);
      expect(lights.fill.intensity).toBe(12);
      const upgraded = { ...config.lightPresets.enhanced, intensity: 750 * 1.2 };
      lights.setPreset(upgraded);
      expect(lights.lights[0].intensity).toBe(2250 * 1.2);
      lights.update(origin, forward);
      expect(lights.lights[0].intensity).toBe(upgraded.intensity);
    } finally {
      lights.dispose();
    }
  });
});
