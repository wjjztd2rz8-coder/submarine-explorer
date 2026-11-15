import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Submarine } from '../../src/sub/Submarine.js';
import type { InputState } from '../../src/core/Input.js';

it('keeps ballast climb available while sliding uphill without entering the seabed', () => {
  const config = resolveEffective(defaultSettings(DEFAULT_CONFIG), 'arcade', null).submarine;
  const terrain = {
    sampleHeight: (x: number) => -1000 + x * 2,
    getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(-2, 1, 0).normalize(),
  };
  const sub = new Submarine(config, terrain);
  sub.setSurveyDistance(100);
  sub.reset(0, sub.floorFor(-1000), 0, Math.PI / 2);
  const input: InputState = {
    throttle: 1,
    ballast: 1,
    yaw: 0,
    pitch: 0,
    lookDx: 0,
    lookDy: 0,
    toggleCamera: false,
    toggleSonar: false,
    toggleLights: false,
    scan: false,
    cycleSimSpeed: false,
    togglePhotoMode: false,
  };
  let rise = 0;
  for (let i = 0; i < 10 * 60; i++) {
    const before = sub.position.y;
    sub.step(input, 1 / 60);
    if (i >= 5 * 60) rise += sub.position.y - before;
    expect(sub.position.y).toBeGreaterThanOrEqual(
      sub.floorFor(terrain.sampleHeight(sub.position.x)) - 0.001,
    );
  }
  // Old collision damping on every tick limited this sustained climb to ~0.2 m/s.
  expect(rise / 5).toBeGreaterThan(0.8);
});
