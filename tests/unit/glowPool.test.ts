import { expect, it } from 'vitest';
import { Light, PointLight, Scene, Vector3 } from 'three';
import {
  GlowLights,
  GLOW_LIGHT_POOL_SIZE,
  reserveGlowLights,
} from '../../src/world/presets/shared.js';

it('keeps the same three point lights before assignment, during flicker and after release/reuse', () => {
  const scene = new Scene();
  const pool = reserveGlowLights(scene);
  const lights = () => scene.getObjectsByProperty('isLight', true);
  expect(pool).toHaveLength(GLOW_LIGHT_POOL_SIZE);
  expect(GLOW_LIGHT_POOL_SIZE).toBe(3); // Maximum shared by VentPreset and SeamountPreset.
  expect(
    pool.every((light) => light instanceof PointLight && light.intensity === 0 && light.visible),
  ).toBe(true);
  expect(reserveGlowLights(scene)).toBe(pool);
  const before = lights();
  expect(before).toEqual(pool);
  for (const count of [3, 1, 2, 0]) {
    const positions = Array.from({ length: count }, (_, i) => new Vector3(i, -20, i * 2));
    const glow = new GlowLights(scene, positions, 0xff9a4a, 260, 60);
    expect(lights()).toEqual(before);
    expect(scene.children.filter((o) => o instanceof Light)).toHaveLength(3);
    glow.update(2);
    for (const [i, light] of pool.entries()) {
      if (i < count) {
        expect(light.position).toEqual(positions[i]);
        expect(light.intensity).toBeGreaterThan(0);
        expect(light.distance).toBe(60);
        expect(light.decay).toBe(2);
      } else expect(light.intensity).toBe(0);
    }
    glow.dispose();
    glow.dispose();
    expect(pool.every((light) => light.intensity === 0 && light.parent === scene)).toBe(true);
    expect(lights()).toEqual(before);
  }
});
