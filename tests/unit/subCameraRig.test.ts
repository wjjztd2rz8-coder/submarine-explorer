/**
 * Camera rig tests. Three.js cameras are plain objects headlessly, so the rig
 * runs unmodified in vitest -- no WebGL context needed.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
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
  it('cycles chase <-> first person on C, and in and out of photo mode on P', () => {
    const rig = new CameraRig(cam, 16 / 9);
    expect(rig.mode).toBe('chase');
    expect(rig.toggleMode()).toBe('first-person');
    expect(rig.togglePhotoMode()).toBe('orbit');
    // Leaving photo mode returns to the view you were in, not to the default.
    expect(rig.togglePhotoMode()).toBe('first-person');
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

describe('CameraRig shake', () => {
  it('displaces on impact and decays back, and honours reduceMotion', () => {
    const pos = new Vector3(0, -2000, 0);
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(pos, 0, 0);
    const rest = rig.camera.position.clone();

    // A few frames of a full-strength hit must move the camera off the rest pose.
    let peak = 0;
    for (let i = 0; i < 10; i++) {
      rig.update(pos, 0, 0, DT, { hullStress: 1 });
      peak = Math.max(peak, rig.camera.position.distanceTo(rest));
    }
    expect(peak).toBeGreaterThan(0.2);

    // Two seconds later (many half-lives) it is back.
    for (let i = 0; i < 120; i++) rig.update(pos, 0, 0, DT);
    expect(rig.camera.position.distanceTo(rest)).toBeLessThan(0.05);

    const calm = new CameraRig(cam, 16 / 9);
    calm.reduceMotion = true;
    calm.snap(pos, 0, 0);
    const calmRest = calm.camera.position.clone();
    for (let i = 0; i < 10; i++) calm.update(pos, 0, 0, DT, { hullStress: 1 });
    expect(calm.camera.position.distanceTo(calmRest)).toBeLessThan(1e-6);
  });
});

describe('CameraRig look-ahead and bank', () => {
  it('aims further ahead the faster the boat is moving', () => {
    const pos = new Vector3(0, -2000, 0);
    const slow = new CameraRig(cam, 16 / 9);
    const fast = new CameraRig(cam, 16 / 9);
    slow.snap(pos, 0, 0);
    fast.snap(pos, 0, 0);
    slow.update(pos, 0, 0, DT, { velocity: new Vector3(0, 0, -0.1) });
    fast.update(pos, 0, 0, DT, { velocity: new Vector3(0, 0, -8) });
    // Pitch (x-rotation) is the same; the difference is how far the aim point
    // is pushed, which tilts the camera's forward vector less steeply downward.
    expect(fast.camera.rotation.x).toBeGreaterThan(slow.camera.rotation.x);
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
    expect(dir.x).toBeGreaterThan(0.5); // toward +X, dipped by chaseLookDrop
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
