import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import {
  REVEAL_MAX_ELEVATION,
  REVEAL_MIN_ELEVATION,
  CameraRig,
  aimAtScreenPoint,
} from '../../src/sub/CameraRig.js';
import {
  revealFrame,
  revealViewFit,
  revealVisibleRect,
  revealSubjectExtent,
} from '../../src/game/Reveal.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';

const FOV = DEFAULT_CONFIG.camera.fovDeg;
const target = new Vector3(0, -100, 0);
const pilot = new Vector3(0, -60, 80);

function rig(floor = -500): CameraRig {
  const r = new CameraRig(DEFAULT_CONFIG.camera, 16 / 9, {
    sampleHeight: () => floor,
    getNormal: () => new Vector3(0, 1, 0),
  });
  r.update(pilot, 0, 0, 0);
  r.beginReveal({
    target,
    screen: { x: 0, y: 0.3 },
    distance: 30,
    elevation: 0.2,
    azimuth: 0,
    sweep: 0.5,
  });
  return r;
}

function settle(r: CameraRig, seconds = 2): void {
  for (let t = 0; t < seconds; t += 1 / 60) r.update(pilot, 0, 0, 1 / 60);
}

function spherical(r: CameraRig) {
  const o = r.camera.position.clone().sub(target);
  return {
    distance: o.length(),
    elevation: Math.asin(o.y / o.length()),
    azimuth: Math.atan2(o.x, o.z),
  };
}

describe('reveal look-around', () => {
  it('orbits freely in azimuth and clamps elevation short of overhead and below level', () => {
    const r = rig();
    settle(r, 1);
    expect(r.revealUserControl).toBe(false);
    r.revealOrbit(Math.PI, 0);
    settle(r);
    expect(r.revealUserControl).toBe(true);
    expect(spherical(r).distance).toBeCloseTo(30, 3);
    expect(Math.abs(Math.cos(spherical(r).azimuth))).toBeGreaterThan(0.9);
    r.revealOrbit(10, 0); // several turns: no limit
    r.revealOrbit(0, 5);
    settle(r);
    expect(spherical(r).elevation).toBeCloseTo(REVEAL_MAX_ELEVATION, 3);
    expect(REVEAL_MAX_ELEVATION).toBeLessThan(Math.PI / 2 - 0.2);
    r.revealOrbit(0, -10);
    settle(r);
    expect(spherical(r).elevation).toBeCloseTo(REVEAL_MIN_ELEVATION, 3);
  });

  it('zooms between 0.6x and 2.5x of the framed distance', () => {
    const r = rig();
    settle(r, 1);
    r.revealZoom(100);
    settle(r);
    expect(spherical(r).distance).toBeCloseTo(75, 2);
    r.revealZoom(0.0001);
    settle(r);
    expect(spherical(r).distance).toBeCloseTo(18, 2);
  });

  it('keeps the subject at the clear area while orbiting, and keeps turning a little after a fling', () => {
    const r = rig();
    settle(r, 1);
    r.revealOrbit(0.3, 0);
    r.revealRelease(2, 0);
    settle(r, 0.1);
    const mid = spherical(r).azimuth;
    settle(r, 2);
    const end = spherical(r).azimuth;
    expect(end).toBeGreaterThan(mid);
    expect(end - mid).toBeLessThan(1);
    r.camera.updateMatrixWorld();
    const p = target.clone().project(r.camera);
    expect(p.x).toBeCloseTo(0, 3);
    expect(p.y).toBeCloseTo(0.3, 3);
  });

  it('lifts the eye and the line of sight above the seabed', () => {
    const r = rig(-102);
    settle(r, 1);
    r.revealOrbit(0, -1);
    settle(r);
    expect(r.camera.position.y).toBeGreaterThanOrEqual(-102 + 4 - 1e-6);
    // Dragging back up responds at once (no dead zone below the lifted angle).
    const before = spherical(r).elevation;
    r.revealOrbit(0, 0.2);
    settle(r);
    expect(spherical(r).elevation).toBeGreaterThan(before + 0.1);
  });

  it('a drag during the opening move takes over from where the camera is', () => {
    const r = rig();
    r.update(pilot, 0, 0, 0.1);
    const at = r.camera.position.clone();
    r.revealOrbit(0.01, 0);
    r.update(pilot, 0, 0, 1 / 60);
    expect(r.camera.position.distanceTo(at)).toBeLessThan(5);
    settle(r);
    expect(spherical(r).distance).toBeCloseTo(30, 2);
  });

  it('returns to the chase view after Continue as before', () => {
    const r = rig();
    settle(r, 1);
    r.revealOrbit(1, 0.3);
    settle(r);
    r.endReveal();
    settle(r, 1);
    expect(r.revealReturning).toBe(false);
    expect(r.revealUserControl).toBe(false);
  });

  it('aims so a point lands exactly at a screen position', () => {
    const cam = new PerspectiveCamera(62, 0.5, 0.1, 1000);
    cam.position.set(10, 5, -20);
    const t = new Vector3(-3, -8, 4);
    for (const [sx, sy] of [
      [0, 0],
      [-0.3, 0],
      [0, 0.34],
      [0.2, -0.4],
    ]) {
      aimAtScreenPoint(cam, t, sx!, sy!);
      cam.updateMatrixWorld();
      const p = t.clone().project(cam);
      expect(p.x).toBeCloseTo(sx!, 6);
      expect(p.y).toBeCloseTo(sy!, 6);
    }
  });
});

describe('reveal distance fits the view', () => {
  it('equals the authored distance at the reference sizes', () => {
    for (const [w, h] of [
      [1280, 720],
      [390, 844],
    ]) {
      expect(revealViewFit(w, h, FOV).scale).toBe(1);
      expect(revealViewFit(w, h, FOV, undefined, { w: 2, h: 2 }).scale).toBeCloseTo(1, 9);
    }
  });

  it('backs off as the clear area above the card shrinks (iPhone Safari with its toolbar)', () => {
    const rect = (y1: number) => ({ x0: 0, x1: 1, y0: 0, y1 });
    const tall = { w: 0.3, h: 0.8 }; // fills ~93% of the reference clear height
    const a = revealViewFit(390, 844, FOV, rect(0.66), tall).scale;
    const b = revealViewFit(390, 664, FOV, rect(0.57), tall).scale;
    const c = revealViewFit(390, 600, FOV, rect(0.5), tall).scale;
    expect(a).toBeCloseTo(1.03, 1);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    // A low, wide subject that already sat well inside the clear height keeps its distance.
    expect(revealViewFit(390, 664, FOV, rect(0.57), { w: 0.7, h: 0.2 }).scale).toBe(1);
    // Without a known size the clear area's shrink applies in full.
    expect(revealViewFit(390, 664, FOV, rect(0.57)).scale).toBeGreaterThan(1.3);
  });

  it('centres the subject in the area the card leaves clear', () => {
    expect(revealViewFit(390, 844, FOV).screen.y).toBeCloseTo(0.34);
    expect(revealVisibleRect(844, 390)).toEqual({ x0: 0, x1: 0.7, y0: 0, y1: 1 });
    expect(revealViewFit(844, 390, FOV).screen).toEqual({ x: expect.closeTo(-0.3), y: 0 });
  });

  it('measures the subject across the sweep', () => {
    const box = new Box3(new Vector3(-20, -5, -2), new Vector3(20, 5, 2));
    const side = revealSubjectExtent(box, new Vector3(), 0, 0, 0);
    expect(side).toEqual({ w: 20, h: 5 });
    const end = revealSubjectExtent(box, new Vector3(), Math.PI / 2, 0, 0);
    expect(end.w).toBeCloseTo(2);
  });

  it('frames from the measured clear area and the prop box', () => {
    const poi = {
      id: 'p',
      kind: 'wreck',
      name: 'p',
      landmarkId: 's',
      position: new Vector3(),
      def: { reveal: { distance_m: 40, elevation_deg: 0, azimuth_deg: 0, sweep_deg: 0 } },
    } as unknown as PlacedPoi;
    const box = new Box3(new Vector3(-10, -12, -10), new Vector3(10, 40, 10));
    const view = (h: number, y1: number) => ({
      width: 390,
      height: h,
      baseFovDeg: FOV,
      rect: { x0: 0, x1: 1, y0: 0, y1 },
      box,
    });
    const ref = revealFrame(poi, pilot, FOV, 390 / 844, undefined, view(844, 0.66));
    const short = revealFrame(poi, pilot, FOV, 390 / 664, undefined, view(664, 0.55));
    expect(ref.distance).toBeCloseTo(40, 6);
    expect(short.distance).toBeGreaterThan(40);
    expect(short.minDistance).toBeCloseTo(short.distance * 0.6);
    expect(short.maxDistance).toBeCloseTo(short.distance * 2.5);
  });
});
