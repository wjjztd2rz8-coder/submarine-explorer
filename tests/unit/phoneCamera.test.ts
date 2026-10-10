/** F-PHONE-CAMERA: phone landscape view shift and short mission titles. */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig, PHONE_LANDSCAPE_SHIFT } from '../../src/sub/CameraRig.js';
import { phoneMissionTitle } from '../../src/ui/ObjectivesPanel.js';

describe('phone landscape view shift', () => {
  it('slides the sub left on screen only when enabled, and clears again', () => {
    const rig = new CameraRig(DEFAULT_CONFIG.camera, 844 / 390);
    const sub = new Vector3(0, -100, 0);
    rig.snap(sub, 0, 0);
    rig.camera.updateMatrixWorld();
    const before = sub.clone().project(rig.camera).x;
    rig.setPhoneLandscape(true);
    const after = sub.clone().project(rig.camera).x;
    expect(after).toBeLessThan(before - PHONE_LANDSCAPE_SHIFT);
    rig.setPhoneLandscape(false);
    expect(sub.clone().project(rig.camera).x).toBeCloseTo(before, 5);
  });
});

describe('phoneMissionTitle', () => {
  it('shortens the long titles and leaves short ones alone', () => {
    expect(phoneMissionTitle('Lost City hydrothermal field dive')).toBe('Lost City dive');
    expect(phoneMissionTitle('Lighthouse Reef: around the Great Blue Hole')).toBe(
      'Lighthouse Reef',
    );
    expect(phoneMissionTitle('Titanic dive')).toBe('Titanic dive');
  });
});
