import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import { headingQuaternion } from '../../src/world/Props.js';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import { buildGeo, isGeoFeature } from '../../src/world/props/geo/index.js';
import { hashString } from '../../src/world/props/geo/shared.js';
import doc from '../../data/landmarks/great-blue-hole/props.json';
import blueHolePoses from '../../tools/blue-hole-poses.json';
import { CameraRig } from '../../src/sub/CameraRig.js';

// The measured grid shows only a flat 4 m platform; the carve digs the hole into it.
const meta = {
  id: 'great-blue-hole',
  center: { lat: 17.31519753916774, lon: -87.53411865234375 },
} as unknown as TileMeta;
const carve = terrainCarveFor(meta)!;
const ground = (x: number, z: number): number => carve.apply(x, z, -4);

describe('Great Blue Hole props', () => {
  const cfg = DEFAULT_CONFIG.props;
  const { props } = parsePropsDoc(doc, cfg);
  const geo = props.filter((p) => p.procedural === 'geo' && isGeoFeature(p.feature ?? ''));

  it('has a seated grotto at the hole', () => {
    expect(geo.length).toBeGreaterThan(0);
  });

  for (const def of geo) {
    it(`${def.id}: stands on the ledge and its foot never floats above the sampled terrain`, () => {
      const { x, z } = latLonToWorld(meta, def.lat, def.lon);
      const originY = ground(x, z);
      // Over the ledge (about 40 m down), not out over the 125 m drop.
      expect(originY).toBeGreaterThan(-60);
      const q = headingQuaternion(def.headingDeg);
      const v = new THREE.Vector3();
      const built = buildGeo({
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg,
        tier: 'high',
        groundHeight: () => (lx: number, lz: number) => {
          v.set(lx, 0, lz).applyQuaternion(q);
          return ground(x + v.x, z + v.z) - originY;
        },
      });
      built.full.updateMatrixWorld(true);
      const foot: number[] = [];
      let minY = Infinity;
      const pts: THREE.Vector3[] = [];
      built.full.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;
        const pos = m.geometry.getAttribute('position');
        for (let i = 0; i < pos.count; i++) {
          const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
          minY = Math.min(minY, p.y);
          pts.push(p);
        }
      });
      for (const p of pts) {
        if (p.y > minY + 4) continue;
        const w = p.clone().applyQuaternion(q);
        foot.push(originY + p.y - ground(x + w.x, z + w.z));
      }
      expect(foot.length).toBeGreaterThan(3);
      // Every low vertex sits within 3 m of the terrain beneath it (none hangs in mid-water).
      expect(Math.max(...foot)).toBeLessThan(3);
      // The shelf's lip is carried by the ledge (not out over the drop (20 m)) and the ground rises behind the wall.
      const [W, D] = def.dimensionsM!;
      const at = (lx: number, lz: number): number => {
        v.set(lx, 0, lz).applyQuaternion(q);
        return ground(x + v.x, z + v.z);
      };
      for (let f = -0.3; f <= 0.3; f += 0.1) {
        expect(at(f * W, -D)).toBeGreaterThan(originY - 20);
        expect(at(f * W, 12)).toBeGreaterThanOrEqual(originY - 0.5);
      }
    });
  }

  for (const tier of ['low', 'high']) {
    it(`east ${tier}: has a roof over the mouth, pendant clearance and a clear close camera`, () => {
      const def = geo.find((p) => p.id === 'karst-grotto-east')!;
      const { x, z } = latLonToWorld(meta, def.lat, def.lon);
      const originY = ground(x, z);
      const q = headingQuaternion(def.headingDeg);
      const localGround = (lx: number, lz: number): number => {
        const p = new THREE.Vector3(lx, 0, lz).applyQuaternion(q);
        return ground(x + p.x, z + p.z) - originY;
      };
      const built = buildGeo({
        def,
        dims: def.dimensionsM!,
        seed: hashString(def.id),
        cfg,
        tier,
        groundHeight: () => localGround,
      });
      built.full.updateMatrixWorld(true);
      const roof = built.full.getObjectByName('grotto-overhang') as THREE.Mesh;
      const gallery = built.full.getObjectByName('stalactite-gallery') as THREE.Mesh;
      // Vertical rays through the mouth must enter AND leave solid limestone,
      // with an actual cavity underneath, across its central span.
      for (const lx of [-8, 0, 8]) {
        const up = new THREE.Raycaster(
          new THREE.Vector3(lx, -100, -14),
          new THREE.Vector3(0, 1, 0),
        );
        const down = new THREE.Raycaster(
          new THREE.Vector3(lx, 100, -14),
          new THREE.Vector3(0, -1, 0),
        );
        const underside = up.intersectObject(roof)[0];
        const top = down.intersectObject(roof)[0];
        expect(underside, `missing overhang at ${lx}`).toBeTruthy();
        expect(top.point.y - underside.point.y).toBeGreaterThan(0.4);
        expect(underside.point.y - localGround(lx, -14)).toBeGreaterThan(3);
      }
      const vertices = gallery.geometry.getAttribute('position');
      let minClearance = Infinity;
      for (let i = 0; i < vertices.count; i++) {
        minClearance = Math.min(
          minClearance,
          vertices.getY(i) - localGround(vertices.getX(i), vertices.getZ(i)),
        );
      }
      expect(minClearance).toBeGreaterThan(0.2);
      // Even Low retains several long pendants among its shorter companions.
      const pendantLengths = built
        .colliders!.slice(-7)
        .map((b) => b.max.y - b.min.y)
        .sort((a, b) => a - b);
      expect(pendantLengths[6]).toBeGreaterThan(3);
      expect(pendantLengths[6] / pendantLengths[0]).toBeGreaterThan(1.2);

      const pose = blueHolePoses.east;
      const target = new THREE.Vector3().fromArray(pose.target).applyQuaternion(q);
      target.add(new THREE.Vector3(x, originY, z));
      const [dx, , dz] = pose.direction;
      const { range, above, lateral } = pose.close;
      const sub = new THREE.Vector3(
        target.x + dx * range - dz * lateral,
        originY + above,
        target.z + dz * range + dx * lateral,
      );
      const yaw = Math.atan2(target.x - sub.x, -(target.z - sub.z));
      const pitch = Math.atan2(target.y - sub.y, sub.distanceTo(target));
      const rig = new CameraRig(DEFAULT_CONFIG.camera, 16 / 9, {
        sampleHeight: ground,
        getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
      });
      rig.setMode('first-person');
      rig.snap(sub, yaw, pitch);
      const eye = rig.camera.position;
      rig.lookElevation =
        (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
        0.55;
      rig.snap(sub, yaw, pitch);
      expect(sub.y - ground(sub.x, sub.z)).toBeGreaterThan(DEFAULT_CONFIG.submarine.hullRadius);
      const toLocal = new THREE.Matrix4()
        .compose(new THREE.Vector3(x, originY, z), q, new THREE.Vector3(1, 1, 1))
        .invert();
      for (const [p, radius] of [
        [sub, DEFAULT_CONFIG.submarine.hullRadius],
        [eye, 0.3],
      ] as const) {
        const sphere = new THREE.Sphere(p.clone().applyMatrix4(toLocal), radius);
        expect(built.colliders!.some((b) => b.intersectsSphere(sphere))).toBe(false);
      }
      // Test actual camera projection: the lip and the apron both fit with margin.
      rig.camera.updateMatrixWorld(true);
      for (const local of [
        new THREE.Vector3(-16, 9, -18),
        new THREE.Vector3(16, 9, -18),
        new THREE.Vector3(0, 1, -8),
      ]) {
        const projected = local
          .applyQuaternion(q)
          .add(new THREE.Vector3(x, originY, z))
          .project(rig.camera);
        expect(Math.abs(projected.x)).toBeLessThan(0.9);
        expect(Math.abs(projected.y)).toBeLessThan(0.9);
        expect(projected.z).toBeGreaterThan(-1);
        expect(projected.z).toBeLessThan(1);
      }
    });
  }
});
