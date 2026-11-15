import { describe, expect, it } from 'vitest';
import { Sphere, Vector3 } from 'three';
import {
  REVEAL_AUTO_DISMISS_S,
  RevealQueue,
  revealExcerpt,
  revealFrame,
  revealStillSubjectYFallback,
} from '../../src/game/Reveal.js';
import { parsePois } from '../../src/game/Pois.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';

const poi = (id: string, kind: PlacedPoi['kind'] = 'wreck'): PlacedPoi => ({
  id,
  kind,
  name: id,
  landmarkId: 'site',
  primary: true,
  guideEntry: id,
  position: new Vector3(0, -100, 0),
  radius: 100,
  scanSeconds: 2,
  def: { id, kind, name: id, lat: 0, lon: 0, primary: true },
});

describe('discovery reveal', () => {
  it('keeps the reveal readable until the player continues', () => {
    expect(REVEAL_AUTO_DISMISS_S).toBe(13);
    expect(revealStillSubjectYFallback()).toBeCloseTo(0.381, 2);
  });
  it('takes complete sentences within the reading budget', () => {
    expect(revealExcerpt('First fact. Second fact! Third fact.')).toBe('First fact. Second fact!');
    expect(revealExcerpt('First fact. ' + 'long '.repeat(80))).toBe('First fact.');
    expect(revealExcerpt('word '.repeat(80)).length).toBeLessThanOrEqual(220);
    expect(revealExcerpt('One. Two.', 220, 1)).toBe('One.');
    expect(revealExcerpt('It is 3.5 metres long. Second fact.')).toBe(
      'It is 3.5 metres long. Second fact.',
    );
  });
  it('uses the reveal sweep portrait crop and honours overrides', () => {
    const p = poi('wreck');
    const sphere = new Sphere(new Vector3(1, -80, 3), 20);
    const frame = revealFrame(p, new Vector3(100, -90, 3), 60, 1, sphere);
    expect(frame.target.equals(sphere.center)).toBe(true);
    expect(frame.azimuth).toBeCloseTo(Math.PI / 2);
    expect(revealFrame(p, p.position, 60, 0.5, sphere).distance).toBe(frame.distance);
    expect(revealFrame(p, p.position, 60, 1).distance).toBe(70);
    expect(revealFrame(poi('vent', 'vent'), p.position, 60, 1).distance).toBe(45);
    p.def.reveal = {
      distance_m: 42,
      elevation_deg: 15,
      azimuth_deg: 90,
      sweep_deg: 0,
      target_offset: [0, 2, 0],
    };
    expect(revealFrame(p, p.position, 60, 1, sphere)).toMatchObject({
      distance: 42,
      sweep: 0,
      target: new Vector3(1, -78, 3),
    });
  });
  it('validates optional authoring values', () => {
    const [p] = parsePois([
      {
        id: 'x',
        lat: 0,
        lon: 0,
        reveal: { distance_m: -3, elevation_deg: 12, target_offset: [0, 2, Infinity] },
      },
    ]);
    expect(p!.reveal).toEqual({ elevation_deg: 12 });
  });
  it('queues concurrent scans once per dive and resets independently of saved unlocks', () => {
    const q = new RevealQueue();
    expect(q.enqueue(poi('a'))).toBe(true);
    expect(q.enqueue(poi('a'))).toBe(false);
    q.enqueue(poi('b'));
    expect(q.active).toBe(true);
    expect(q.next()?.id).toBe('a');
    expect(q.next()?.id).toBe('b');
    expect(q.next()).toBeNull();
    expect(q.active).toBe(false);
    q.reset();
    expect(q.enqueue(poi('a'))).toBe(true);
  });
  it('restores the exact camera view and keeps reveal above the seabed', () => {
    const rig = new CameraRig(DEFAULT_CONFIG.camera, 1, {
      sampleHeight: () => -90,
      getNormal: () => new Vector3(0, 1, 0),
    });
    const pilot = new Vector3(0, -50, 0);
    rig.lookAzimuth = 0.4;
    rig.setMode('first-person');
    rig.update(pilot, 0.3, 0.1, 0);
    const position = rig.camera.position.clone();
    const rotation = rig.camera.quaternion.clone();
    rig.beginReveal({
      target: new Vector3(50, -100, 0),
      distance: 25,
      elevation: 0.2,
      azimuth: 0,
      sweep: 0.7,
    });
    rig.update(pilot, 0.3, 0.1, 3);
    expect(rig.camera.position.y).toBeGreaterThanOrEqual(-86);
    expect(
      rig.camera
        .getWorldDirection(new Vector3())
        .dot(new Vector3(50, -100, 0).sub(rig.camera.position).normalize()),
    ).toBeCloseTo(1, 8);
    rig.endReveal();
    rig.update(pilot, 0.3, 0.1, 0.6);
    expect(rig.mode).toBe('first-person');
    expect(rig.lookAzimuth).toBe(0.4);
    expect(rig.camera.position.distanceTo(position)).toBeLessThan(1e-8);
    expect(rig.camera.quaternion.angleTo(rotation)).toBeLessThan(1e-7);
  });
});
