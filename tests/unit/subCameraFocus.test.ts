/**
 * Fix S (QA-B #6): with a scan target in range, the chase camera is offset so
 * the line of sight to the target clears the boat's own hull.
 */

import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { CameraRig, chooseFocusSide, focusedChaseOffset } from '../../src/sub/CameraRig.js';

const cam = DEFAULT_CONFIG.camera;
const DT = 1 / 60;

/** Distance from point p to the segment a-b. */
function segDist(p: Vector3, a: Vector3, b: Vector3): number {
  const ab = b.clone().sub(a);
  const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

function settle(rig: CameraRig, pos: Vector3, yaw: number, focus: Vector3 | null, s = 4): void {
  for (let i = 0; i < s * 60; i++) rig.update(pos, yaw, 0, DT, { focus });
}

describe('chase camera scan-target framing', () => {
  // The QA repro: the bow ~100 m ahead of the boat and ~20 m below it.
  const sub = new Vector3(0, -3780, 0);
  const bow = new Vector3(0, -3800, -100);

  it('without a focus the boat sits on the camera-to-target line (the bug)', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    settle(rig, sub, 0, null);
    expect(segDist(sub, rig.camera.position, bow)).toBeLessThan(10);
  });

  it('with the focus the sight line clears the hull by a wide margin', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    settle(rig, sub, 0, bow);
    expect(rig.focusWeight).toBeGreaterThan(0.99);
    // The hull is 26 m long, ~2.3 m radius; dive planes span ~7.5 m.
    expect(segDist(sub, rig.camera.position, bow)).toBeGreaterThan(15);
    expect(rig.camera.position.y).toBeGreaterThan(sub.y + cam.chaseOffset.y);
  });

  it('slides toward the target side, and holds the side for a target dead ahead', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    settle(rig, sub, 0, new Vector3(-60, -3800, -80)); // to port
    expect(rig.focusSide).toBe(-1);
    expect(rig.camera.position.x).toBeLessThan(sub.x - cam.focusSideM * 0.9);
    settle(rig, sub, 0, bow); // dead ahead: keep port
    expect(rig.focusSide).toBe(-1);
    // Heading east (+yaw): starboard is +Z (south).
    const r2 = new CameraRig(cam, 16 / 9);
    r2.snap(sub, Math.PI / 2, 0);
    settle(r2, sub, Math.PI / 2, new Vector3(100, -3800, 40));
    expect(r2.focusSide).toBe(1);
  });

  it('blends in and out with the configured half-life', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.snap(sub, 0, 0);
    const steps = Math.round(cam.focusHalfLife / DT);
    for (let i = 0; i < steps; i++) rig.update(sub, 0, 0, DT, { focus: bow });
    expect(rig.focusWeight).toBeGreaterThan(0.45);
    expect(rig.focusWeight).toBeLessThan(0.55);
    settle(rig, sub, 0, null, 12);
    expect(rig.focusWeight).toBe(0);
  });

  it('first person ignores the focus', () => {
    const rig = new CameraRig(cam, 16 / 9);
    rig.setMode('first-person');
    rig.snap(sub, 0, 0);
    settle(rig, sub, 0, bow);
    expect(rig.focusWeight).toBe(0);
    expect(rig.camera.position.distanceTo(sub)).toBeLessThan(30);
  });

  it('pure helpers', () => {
    expect(chooseFocusSide(10, -1, 6)).toBe(1);
    expect(chooseFocusSide(-10, 1, 6)).toBe(-1);
    expect(chooseFocusSide(3, -1, 6)).toBe(-1);
    expect(focusedChaseOffset(cam, 0, 1)).toEqual(cam.chaseOffset);
    expect(focusedChaseOffset(cam, 1, -1)).toEqual({
      x: cam.chaseOffset.x - cam.focusSideM,
      y: cam.chaseOffset.y + cam.focusRaiseM,
      z: cam.chaseOffset.z,
    });
  });
});
