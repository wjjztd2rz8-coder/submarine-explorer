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
      // Every low vertex sits within 2 m of the terrain beneath it (none hangs in mid-water).
      const worst = Math.max(...foot);
      console.log(def.id, 'worst foot gap', worst.toFixed(2), 'n', foot.length);
      expect(worst).toBeLessThan(2);
    });
  }
});
