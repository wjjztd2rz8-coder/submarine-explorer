import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import {
  collideAll,
  makeBoxCollider,
  makeSphereCollider,
  pushOutOfBox,
  pushOutOfSphere,
} from '../../src/world/props/Collision.js';
import { Props, type PropsHeightField } from '../../src/world/Props.js';
import { PropContact, atSpawnPose, parseAtParam } from '../../src/world/props/Wiring.js';
import { latLonToWorld } from '../../src/util/geo.js';
import { makeSyntheticTile } from './helpers.js';

const v = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const qYaw = (deg: number): THREE.Quaternion =>
  new THREE.Quaternion().setFromAxisAngle(v(0, 1, 0), THREE.MathUtils.degToRad(deg));

describe('sphere vs sphere', () => {
  it('pushes the body out to touching distance along the centre line', () => {
    const c = makeSphereCollider(v(0, 0, 0), 4);
    const p = v(5, 0, 0);
    const n = new THREE.Vector3();
    expect(pushOutOfSphere(p, 2, c, 1, n)).toBeCloseTo(1);
    expect(p.x).toBeCloseTo(6);
    expect(n.toArray()).toEqual([1, 0, 0]);
  });

  it('ignores a body that is not touching', () => {
    const p = v(7, 0, 0);
    const n = v(9, 9, 9);
    expect(pushOutOfSphere(p, 2, makeSphereCollider(v(0, 0, 0), 4), 1, n)).toBe(0);
    expect(p.x).toBe(7);
    expect(n.x).toBe(9);
  });

  it('pushes a dead-centre body straight up', () => {
    const p = v(0, 0, 0);
    const n = new THREE.Vector3();
    pushOutOfSphere(p, 1, makeSphereCollider(v(0, 0, 0), 3), 1, n);
    expect(n.y).toBe(1);
    expect(p.y).toBeCloseTo(4);
  });

  it('applies stiffness as a fraction of the penetration', () => {
    const p = v(5, 0, 0);
    pushOutOfSphere(p, 2, makeSphereCollider(v(0, 0, 0), 4), 0.5, new THREE.Vector3());
    expect(p.x).toBeCloseTo(5.5);
  });
});

describe('sphere vs oriented box', () => {
  const box = makeBoxCollider(v(0, 5, 0), v(10, 5, 2), new THREE.Quaternion());

  it('pushes off a face along its normal', () => {
    const p = v(0, 5, 3);
    const n = new THREE.Vector3();
    expect(pushOutOfBox(p, 2, box, 1, n)).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(4);
    expect(n.z).toBeCloseTo(1);
  });

  it('pushes off an edge diagonally', () => {
    const p = v(11, 11, 0);
    const n = new THREE.Vector3();
    const pen = pushOutOfBox(p, 2, box, 1, n);
    expect(pen).toBeCloseTo(2 - Math.SQRT2);
    expect(n.x).toBeCloseTo(Math.SQRT1_2);
    expect(n.y).toBeCloseTo(Math.SQRT1_2);
    expect(p.distanceTo(v(10, 10, 0))).toBeCloseTo(2);
  });

  it('exits through the nearest face when the centre is inside', () => {
    const p = v(3, 9.5, 0.5); // 0.5 below the top, 1.5 from the +z face
    const n = new THREE.Vector3();
    const pen = pushOutOfBox(p, 2, box, 1, n);
    expect(n.y).toBe(1);
    expect(pen).toBeCloseTo(0.5 + 2);
    expect(p.y).toBeCloseTo(12);
  });

  it('respects the box rotation (heading 90: long axis east-west)', () => {
    // Long axis along local X; rotate 90 deg about Y so it runs along world Z.
    const rotated = makeBoxCollider(v(0, 5, 0), v(10, 5, 2), qYaw(90));
    const p = v(2.5, 5, 8); // beside the rotated box's long axis; the unrotated box would miss it
    const n = new THREE.Vector3();
    expect(pushOutOfBox(p, 1, rotated, 1, n)).toBeGreaterThan(0);
    expect(Math.abs(n.x)).toBeCloseTo(1);
    const miss = v(8, 5, 0);
    expect(pushOutOfBox(miss, 1, rotated, 1, n)).toBe(0);
  });
});

describe('collideAll', () => {
  it('skips far colliders and averages normals of simultaneous contacts', () => {
    const cs = [
      makeSphereCollider(v(-3, 0, 0), 2),
      makeSphereCollider(v(3, 0, 0), 2),
      makeSphereCollider(v(1000, 0, 0), 2),
    ];
    const p = v(0, 1.5, 0);
    const out = new THREE.Vector3();
    expect(collideAll(cs, p, 2, 1, out)).toBe(true);
    // Contacts resolve in turn, so the result is near-vertical, not exact.
    expect(out.y).toBeGreaterThan(0.9);
    expect(out.length()).toBeCloseTo(1);
    expect(collideAll(cs, v(0, 50, 0), 2, 1, out)).toBe(false);
    expect(out.length()).toBe(0);
  });
});

describe('Props.collide + PropContact', () => {
  const { meta } = makeSyntheticTile({ cols: 40, rows: 40 });
  const flat: PropsHeightField = {
    sampleHeight: () => -3800,
    getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
  };
  const cfg = DEFAULT_CONFIG.props;

  async function hullProps(): Promise<Props> {
    const props = new Props(meta, flat, cfg);
    await props.placeAll(
      {
        props: [
          {
            id: 'hull',
            model: 'procedural:hull-block',
            lat: 41.73,
            lon: -49.95,
            snap_to_seabed: true,
            heading_deg: 90,
            dimensions_m: [100, 20, 20],
            collision: 'box',
          },
        ],
      },
      't',
    );
    return props;
  }

  it('pushes the sub out of a placed hull and reports the normal', async () => {
    const props = await hullProps();
    const { x, z } = latLonToWorld(meta, 41.73, -49.95);
    // Heading 90: the hull's length runs east-west, so its beam faces north/south.
    const p = v(x + 20, -3790, z - 14); // 14 m north of the centreline, inside radius 8 of the north face
    const out = new THREE.Vector3();
    expect(props.collide(p, 8, out)).toBe(true);
    expect(out.z).toBeLessThan(-0.9);
    expect(p.z).toBeLessThanOrEqual(z - 10 - 8 + 1e-6);
  });

  it('damps into-surface velocity and emits sub:collided once per contact', async () => {
    const props = await hullProps();
    const bus = new EventBus();
    const events: number[] = [];
    bus.on('sub:collided', (e) => events.push(e.speed));
    const contact = new PropContact(props, bus, cfg, 8);
    const { x, z } = latLonToWorld(meta, 41.73, -49.95);
    const body = { position: v(x, -3790, z - 16), velocity: v(1, 0, 3) }; // moving south, into the hull
    expect(contact.resolve(body, 1 / 60)).toBe(true);
    expect(body.velocity.z).toBeCloseTo(0);
    expect(body.velocity.x).toBeCloseTo(1); // tangential motion kept
    expect(events).toHaveLength(1);
    expect(events[0]).toBeCloseTo(Math.hypot(1, 3));
    // Still resting against it next frame: no new event.
    body.position.z = z - 17.9;
    contact.resolve(body, 1 / 60);
    expect(events).toHaveLength(1);
  });
});

describe('?at= spawn', () => {
  it('parses lat,lon[,heading]', () => {
    expect(parseAtParam('41.73,-49.95')).toEqual({ lat: 41.73, lon: -49.95, headingDeg: 0 });
    expect(parseAtParam(' 41.73 , -49.95 , 90')).toEqual({
      lat: 41.73,
      lon: -49.95,
      headingDeg: 90,
    });
    expect(parseAtParam(null)).toBeNull();
    expect(parseAtParam('41.73')).toBeNull();
    expect(parseAtParam('abc,def')).toBeNull();
    expect(parseAtParam('95,0')).toBeNull();
  });

  it('keeps clearance above the seabed and converts heading to sub yaw', () => {
    const { meta } = makeSyntheticTile({ cols: 40, rows: 40 });
    const hf: PropsHeightField = {
      sampleHeight: () => -3800,
      getNormal: (_x, _z, o = new THREE.Vector3()) => o.set(0, 1, 0),
    };
    const at = { lat: 41.73, lon: -49.95, headingDeg: 90 };
    expect(atSpawnPose(at, meta, hf, 3790, 30, 8).y).toBe(-3770);
    expect(atSpawnPose(at, meta, hf, 3000, 30, 8).y).toBe(-3000);
    expect(atSpawnPose(at, meta, hf, null, 30, 8).y).toBe(-3770);
    expect(atSpawnPose(at, meta, hf, null, 30, 8).yaw).toBeCloseTo(Math.PI / 2);
  });
});
