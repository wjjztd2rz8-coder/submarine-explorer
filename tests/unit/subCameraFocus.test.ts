import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';

describe('camera chase framing', () => {
  it('follows heading without following pitch', () => {
    const pos = new Vector3(0, -1000, 0);
    const rig = new CameraRig(DEFAULT_CONFIG.camera, 16 / 9);
    rig.snap(pos, 0, 0);
    const initialHeight = rig.camera.position.y;
    rig.update(pos, 0, 0.5, 1 / 60);
    expect(rig.camera.position.y).toBeCloseTo(initialHeight);
    rig.update(pos, Math.PI / 2, -0.5, 1 / 60);
    expect(rig.camera.position.x).toBeLessThan(-80);
  });
});
