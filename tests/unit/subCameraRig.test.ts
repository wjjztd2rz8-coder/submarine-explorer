/**
 * Camera rig tests. Three.js cameras are plain objects headlessly, so the rig
 * runs unmodified in vitest -- no WebGL context needed.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig, PHOTO_ORBIT_MAX_M, PHOTO_ORBIT_MIN_M } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { Submarine, type HeightField } from '../../src/sub/Submarine.js';

const cam = DEFAULT_CONFIG.camera;
const DT = 1 / 60;

function flatSeabed(depth: number): HeightField {
  return {
    sampleHeight: () => depth,
    getNormal: (_x, _z, out = new Vector3()) => out.set(0, 1, 0),
  };
}

function settle(rig: CameraRig, pos: Vector3, yaw = 0, pitch = 0, seconds = 3): void {
  for (let i = 0; i < seconds * 60; i++) rig.update(pos, yaw, pitch, DT);
}

describe('CameraRig modes', () => {
  it('cycles chase <-> first person on Q, and in and out of photo mode on P', () => {
    const rig = new CameraRig(cam, 16 / 9);
    expect(rig.mode).toBe('chase');
    expect(rig.toggleMode()).toBe('first-person');
    expect(rig.togglePhotoMode()).toBe('orbit');
    // Leaving photo mode returns to the view you were in, not to the default.
    expect(rig.togglePhotoMode()).toBe('first-person');
  });

  it('photo mode starts on the current view, stays in range and restores it exactly', () => {
    const pos = new Vector3(0, -3000, 0);
    const rig = new CameraRig(cam, 16 / 9, flatSeabed(-3040));
    rig.orbit(0.4, 0.1, 0.3); // a dragged, zoomed chase view
    rig.snap(pos, 0.7, 0);
    const chase = rig.camera.position.clone();
    const chaseLook = rig.camera.getWorldDirection(new Vector3());
    expect(rig.enterPhotoMode(pos)).toBe('orbit');
    rig.update(pos, 0.7, 0, DT);
    expect(rig.camera.position.distanceTo(chase)).toBeLessThan(0.5);
    expect(rig.camera.getWorldDirection(new Vector3()).angleTo(chaseLook)).toBeLessThan(0.01);
    rig.orbit(1.2, -1.3, 50); // far below and far out
    rig.update(pos, 0.7, 0, DT);
    expect(rig.camera.position.distanceTo(pos)).toBeLessThanOrEqual(PHOTO_ORBIT_MAX_M + 1e-6);
    expect(rig.camera.position.y).toBeGreaterThanOrEqual(-3040 + cam.terrainClearance - 1e-6);
    rig.orbit(0, 0, -0.99);
    rig.update(pos, 0.7, 0, DT);
    expect(rig.orbitRadius).toBe(PHOTO_ORBIT_MIN_M);
    expect(rig.exitPhotoMode()).toBe('chase');
    rig.update(pos, 0.7, 0, DT);
    expect(rig.camera.position.distanceTo(chase)).toBeLessThan(1e-6);
  });

  it('sits behind and above the boat in chase, and at the eye point in FP', () => {
    const pos = new Vector3(0, -3000, 0);
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(pos, 0, 0);
    // yaw 0 faces north (-Z), so the chase camera is to the south (+Z).
    expect(rig.camera.position.z).toBeGreaterThan(pos.z);
    expect(rig.camera.position.y).toBeGreaterThan(pos.y);

    rig.setMode('first-person');
    rig.snap(pos, 0, 0);
    expect(rig.camera.position.distanceTo(pos)).toBeLessThan(30);
  });

  it('orbits around the boat at the configured radius', () => {
    const pos = new Vector3(100, -2000, -50);
    const rig = new CameraRig(cam, 16 / 9);
    rig.togglePhotoMode();
    rig.snap(pos, 0, 0);
    expect(rig.camera.position.distanceTo(pos)).toBeCloseTo(cam.orbitRadius, 3);

    const before = rig.camera.position.clone();
    rig.orbit(Math.PI / 2, 0);
    rig.update(pos, 0, 0, DT);
    expect(rig.camera.position.distanceTo(before)).toBeGreaterThan(10);
    expect(rig.camera.position.distanceTo(pos)).toBeCloseTo(cam.orbitRadius, 3);
  });
});

describe('CameraRig terrain collision', () => {
  it('never lets the camera drop below the seabed clearance', () => {
    const seabed = -3900;
    const rig = new CameraRig(cam, 16 / 9, flatSeabed(seabed));
    // Nose-down, hugging the bottom: the chase offset would otherwise dig in.
    const pos = new Vector3(0, seabed + 12, 0);
    settle(rig, pos, 0, -Math.PI / 4);
    expect(rig.camera.position.y).toBeGreaterThanOrEqual(seabed + cam.terrainClearance - 1e-6);
  });

  it('without a heightfield it simply does not collide (unit tests, menus)', () => {
    const rig = new CameraRig(cam, 16 / 9);
    const pos = new Vector3(0, -3900, 0);
    settle(rig, pos, 0, -Math.PI / 4);
    expect(Number.isFinite(rig.camera.position.y)).toBe(true);
  });
});

describe('CameraRig look-ahead and bank', () => {
  it('keeps the boat in the lower third at both cruise and boost speeds', () => {
    const pos = new Vector3(0, -2000, 0);
    const slow = new CameraRig(cam, 16 / 9);
    const fast = new CameraRig(cam, 16 / 9);
    slow.snap(pos, 0, 0);
    fast.snap(pos, 0, 0);
    slow.update(pos, 0, 0, DT, { velocity: new Vector3(0, 0, -0.1) });
    fast.update(pos, 0, 0, DT, { velocity: new Vector3(0, 0, -8) });
    for (const rig of [slow, fast]) {
      rig.camera.updateMatrixWorld();
      const screen = pos.clone().project(rig.camera);
      expect(Math.abs(screen.x)).toBeLessThan(0.05);
      expect(screen.y).toBeGreaterThan(-0.9);
      expect(screen.y).toBeLessThan(-0.35);
    }
  });

  it('copies a fraction of the boat roll, and none of it under reduceMotion', () => {
    const pos = new Vector3(0, -2000, 0);
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(pos, 0, 0);
    for (let i = 0; i < 120; i++) rig.update(pos, 0, 0, DT, { roll: 0.4 });
    expect(Math.abs(rig.camera.rotation.z)).toBeGreaterThan(0.05);

    const calm = new CameraRig(cam, 16 / 9);
    calm.reduceMotion = true;
    calm.snap(pos, 0, 0);
    for (let i = 0; i < 120; i++) calm.update(pos, 0, 0, DT, { roll: 0.4 });
    expect(Math.abs(calm.camera.rotation.z)).toBeLessThan(1e-6);
  });
});

describe('CameraRig mouse response and framing', () => {
  const sub = new Vector3(0, -3800, 0);

  it('maps drag directly and changes orbit angle less than 2% after release', () => {
    for (const mode of ['chase', 'first-person', 'orbit'] as const) {
      const rig = new CameraRig(cam, 16 / 9);
      rig.setMode(mode);
      rig.snap(sub, 0, 0);
      const drag = 0.4;
      rig.orbit(drag, -0.2);
      rig.update(sub, 0, 0, DT);
      expect(mode === 'orbit' ? rig.orbitAzimuth : rig.lookAzimuth).toBeCloseTo(drag, 8);
      const atRelease = Math.atan2(rig.camera.position.x - sub.x, rig.camera.position.z - sub.z);
      for (let i = 0; i < 12; i++) rig.update(sub, 0, 0, DT);
      const atRest = Math.atan2(rig.camera.position.x - sub.x, rig.camera.position.z - sub.z);
      expect(Math.abs(atRest - atRelease)).toBeLessThan(drag * 0.02);
    }
  });

  it('keeps free-look orbit fixed in world space through boat yaw and pitch', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    rig.orbit(0.4, -0.15);
    rig.update(sub, 0, 0, DT);
    expect(rig.freeLook).toBe(true);
    settle(rig, sub, 0, 0, 0.25);
    rig.camera.updateMatrixWorld();
    const centred = sub.clone().project(rig.camera);
    expect(Math.abs(centred.x)).toBeLessThan(0.05);
    expect(Math.abs(centred.y)).toBeLessThan(0.05);
    const offset = rig.camera.position.clone().sub(sub);
    const direction = rig.camera.getWorldDirection(new Vector3());
    rig.update(sub.clone().add(new Vector3(10, 5, -20)), 1.5, 0.4, DT);
    rig.camera.updateMatrixWorld();
    const moved = sub
      .clone()
      .add(new Vector3(10, 5, -20))
      .project(rig.camera);
    expect(Math.abs(moved.x)).toBeLessThan(0.05);
    expect(Math.abs(moved.y)).toBeLessThan(0.05);
    expect(
      rig.camera.position
        .clone()
        .sub(sub)
        .sub(new Vector3(10, 5, -20))
        .distanceTo(offset),
    ).toBeLessThan(1e-6);
    expect(rig.camera.getWorldDirection(new Vector3()).distanceTo(direction)).toBeLessThan(1e-6);
    rig.resetView();
    rig.update(sub, 1.5, 0.4, DT);
    expect(rig.mode).toBe('chase');
    expect(rig.freeLook).toBe(false);
    expect(rig.camera.position.x).toBeLessThan(sub.x - cam.chaseOffset.z * 0.8);
  });

  it('blends from chase aim to the hull without an entry jump', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    const before = rig.camera.getWorldDirection(new Vector3());
    rig.orbit(0.02, 0);
    rig.update(sub, 0, 0, DT);
    expect(rig.camera.getWorldDirection(new Vector3()).angleTo(before)).toBeLessThan(0.06);
    settle(rig, sub, 0, 0, 0.25);
    rig.camera.updateMatrixWorld();
    expect(Math.abs(sub.clone().project(rig.camera).y)).toBeLessThan(0.05);
  });

  it('enters free look after several small direct pointer deltas', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    rig.orbit(0.005, 0.002);
    rig.orbit(0.005, 0.002);
    expect(rig.freeLook).toBe(false);
    rig.orbit(0.005, 0.002);
    expect(rig.freeLook).toBe(true);
    expect(rig.lookAzimuth).toBeCloseTo(0.015);
  });

  it('camera view toggle leaves free look and restores chase on the next toggle', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    rig.orbit(0.3, 0.1);
    expect(rig.freeLook).toBe(true);
    expect(rig.toggleMode()).toBe('first-person');
    expect(rig.freeLook).toBe(false);
    expect(rig.toggleMode()).toBe('chase');
    expect(rig.lookAzimuth).toBe(0);
  });
});

// B3 / F1: the hull and the chase camera used to be mirrored across the N-S
// axis. Physics yaw is a compass angle (+yaw = east, Submarine.getForward);
// a raw Three.js +Y rotation turns -Z to the west, so the presentation side
// has to negate it.
describe('CameraRig + SubMesh follow the physics heading (F1)', () => {
  const east = Math.PI / 2;

  function forwardOf(yaw: number, pitch: number): Vector3 {
    const sub = new Submarine(DEFAULT_CONFIG.submarine, flatSeabed(-5000));
    sub.reset(0, 0, 0, yaw);
    sub.pitch = pitch;
    return sub.getForward(new Vector3());
  }

  it('at yaw +pi/2 (east) the settled chase camera is WEST of the boat, looking east', () => {
    const pos = new Vector3(500, -3000, -200);
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(pos, east, 0);
    settle(rig, pos, east, 0);
    expect(rig.camera.position.x).toBeLessThan(pos.x - 0.75 * cam.chaseOffset.z);
    expect(Math.abs(rig.camera.position.z - pos.z)).toBeLessThan(1);
    const dir = rig.camera.getWorldDirection(new Vector3());
    expect(dir.x).toBeGreaterThan(0.5); // toward +X
    expect(Math.abs(dir.z)).toBeLessThan(1e-6);
  });

  it('at yaw -pi/2 (west) the chase camera is east of the boat', () => {
    const pos = new Vector3(0, -3000, 0);
    const rig = new CameraRig(cam, 16 / 9);
    settle(rig, pos, -east, 0);
    expect(rig.camera.position.x).toBeGreaterThan(pos.x + 0.75 * cam.chaseOffset.z);
  });

  it('the first-person camera looks along Submarine.getForward at any heading', () => {
    const pos = new Vector3(0, -3000, 0);
    for (const [yaw, pitch] of [
      [east, 0],
      [2.6, 0.3], // ~150 deg, nose up
      [-2.2, -0.4],
      [0, 0],
    ] as const) {
      const rig = new CameraRig(cam, 16 / 9);
      rig.setMode('first-person');
      rig.snap(pos, yaw, pitch);
      const dir = rig.camera.getWorldDirection(new Vector3());
      expect(dir.dot(forwardOf(yaw, pitch))).toBeGreaterThan(0.999);
    }
  });

  it('SubMesh.setPose points the nose (local -Z) along getForward and leans into turns', () => {
    const mesh = new SubMesh({ length: 26 });
    for (const [yaw, pitch] of [
      [east, 0],
      [2.6, 0.25],
      [-1, -0.3],
    ] as const) {
      mesh.setPose(new Vector3(1, 2, 3), yaw, pitch, 0);
      mesh.group.updateMatrixWorld(true);
      const nose = new Vector3(0, 0, -1).applyQuaternion(mesh.group.quaternion);
      expect(nose.dot(forwardOf(yaw, pitch))).toBeGreaterThan(0.9999);
      expect(mesh.group.position.toArray()).toEqual([1, 2, 3]);
    }
    // A starboard turn gives a negative roll (Submarine): the starboard side
    // (local +X) must dip, i.e. the hull leans into the turn.
    mesh.setPose(new Vector3(), east, 0, -0.3);
    const starboard = new Vector3(1, 0, 0).applyQuaternion(mesh.group.quaternion);
    expect(starboard.y).toBeLessThan(-0.2);
    // ... and the camera banks the same way (its right side dips).
    const rig = new CameraRig(cam, 16 / 9);
    const pos = new Vector3(0, -3000, 0);
    for (let i = 0; i < 180; i++) rig.update(pos, east, 0, DT, { roll: -0.3 });
    const camRight = new Vector3(1, 0, 0).applyQuaternion(rig.camera.quaternion);
    expect(camRight.y).toBeLessThan(-0.05);
  });
});

it('retains a close portrait arm through zoom, free look, rotation and reset', () => {
  const position = new Vector3(0, -3000, 0);
  const rig = new CameraRig(cam, 390 / 844);
  const defaultRadius = Math.hypot(cam.chaseOffset.x, cam.chaseOffset.y, cam.chaseOffset.z);
  rig.setChaseRadiusDefault(undefined, -220, -10, { x: 0, y: -48, radius: 52 });
  rig.snap(position, 0.7, 0);
  const portraitEye = rig.camera.position.clone();
  expect(portraitEye.distanceTo(position)).toBeCloseTo(52, 8);
  rig.orbit(0.1, 0.05);
  rig.snap(position, 0.7, 0);
  expect(rig.freeLook).toBe(true);
  expect(rig.camera.position.distanceTo(position)).toBeCloseTo(52, 8);
  rig.orbit(0, 0, 0.2);
  rig.snap(position, 0.7, 0);
  expect(rig.camera.position.distanceTo(position)).toBeCloseTo(52 * 1.2, 8);
  rig.setAspect(16 / 9);
  rig.snap(position, 0.7, 0);
  expect(rig.camera.position.distanceTo(position)).toBeCloseTo(defaultRadius * 1.2, 8);
  rig.resetView();
  rig.snap(position, 0.7, 0);
  expect(rig.camera.position.distanceTo(position)).toBeCloseTo(defaultRadius, 8);
  rig.setAspect(390 / 844);
  rig.snap(position, 0.7, 0);
  expect(rig.camera.position).toEqual(portraitEye);
  // Loading a new dive without the override restores the usual portrait distance.
  rig.setChaseRadiusDefault();
  rig.snap(position, 0.7, 0);
  expect(rig.camera.position.distanceTo(position)).toBeCloseTo(defaultRadius, 8);
});
