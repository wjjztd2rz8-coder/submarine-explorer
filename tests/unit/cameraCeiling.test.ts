import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';

const config = DEFAULT_CONFIG.camera;
const terrain = (height: (x: number, z: number) => number) => ({
  sampleHeight: height,
  getNormal: (_x: number, _z: number, out = new Vector3()) => out.set(0, 1, 0),
});

describe('underwater camera ceiling', () => {
  it('retracts continuously on ascent and restores the full arm at depth', () => {
    const rig = new CameraRig(
      config,
      16 / 9,
      terrain(() => -100),
    );
    const pos = new Vector3(0, -60, 0);
    rig.snap(pos, 0, 0);
    expect(rig.camera.position.z).toBe(config.chaseOffset.z);
    let last = rig.camera.position.clone();
    for (let depth = 60; depth >= 8; depth -= 0.1) {
      pos.y = -depth;
      rig.update(pos, 0, 0.4, 1 / 60);
      expect(rig.camera.position.y).toBeLessThanOrEqual(-config.surfaceClearance + 1e-8);
      expect(rig.camera.position.distanceTo(last)).toBeLessThan(0.3);
      last.copy(rig.camera.position);
    }
    expect(rig.camera.position.z).toBeLessThan(config.chaseOffset.z / 4);
    rig.snap(new Vector3(0, -3000, 0), 0, 0);
    expect(rig.camera.position.z).toBe(config.chaseOffset.z);
  });

  it('retracts away from a sloping reef instead of raising the eye above water', () => {
    const field = terrain((_x, z) => -30 + z * 0.5);
    const rig = new CameraRig(config, 16 / 9, field);
    const pos = new Vector3(0, -16, 0);
    rig.snap(pos, 0, 0);
    expect(rig.camera.position.z).toBeLessThan(44.001);
    let last = rig.camera.position.clone();
    for (let frame = 0; frame < 240; frame++) {
      const yaw = (frame / 240) * Math.PI;
      rig.update(pos, yaw, 0, 1 / 60);
      const eye = rig.camera.position;
      expect(eye.y).toBeLessThanOrEqual(-config.surfaceClearance + 1e-8);
      expect(eye.y).toBeGreaterThanOrEqual(
        field.sampleHeight(eye.x, eye.z) + config.terrainClearance - 1e-8,
      );
      expect(eye.distanceTo(last)).toBeLessThan(1);
      last.copy(eye);
    }
  });

  it('keeps free look and photo return underwater without a position jump', () => {
    const rig = new CameraRig(
      config,
      16 / 9,
      terrain(() => -80),
    );
    const pos = new Vector3(0, -12, 0);
    rig.snap(pos, 0, 0);
    rig.orbit(0.1, 0.1);
    rig.update(pos, 0, 0, 1 / 60);
    const before = rig.camera.position.clone();
    rig.enterPhotoMode(pos);
    rig.update(pos, 0, 0, 1 / 60);
    expect(rig.camera.position.distanceTo(before)).toBeLessThan(1e-6);
    rig.exitPhotoMode();
    rig.update(pos, 0, 0, 1 / 60);
    expect(rig.camera.position.distanceTo(before)).toBeLessThan(1e-6);
    rig.toggleMode();
    rig.update(pos, 0, 0.6, 1 / 60);
    expect(rig.camera.position.y).toBeLessThanOrEqual(-config.surfaceClearance);
    rig.toggleMode();
    rig.update(pos, 0, 0, 1 / 60);
    expect(rig.camera.position.y).toBeLessThanOrEqual(-config.surfaceClearance);
  });
});
