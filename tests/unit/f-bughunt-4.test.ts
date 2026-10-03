// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import { createTerrainMaterial } from '../../src/world/TerrainMaterial.js';
import { biomeFor } from '../../src/world/TerrainBiome.js';
import { decodeHeightmap, validateMeta } from '../../src/world/TileLoader.js';
import type { Tile, TileMeta } from '../../src/util/types.js';
import { buildScarp } from '../../src/world/props/geo/scarp.js';
import { parsePropsDoc } from '../../src/world/PropLoader.js';
import { Submarine } from '../../src/sub/Submarine.js';
import type { InputState } from '../../src/core/Input.js';
import { worldToLatLon } from '../../src/util/geo.js';

function actualTile(id: string): Tile {
  const meta = JSON.parse(readFileSync(`data/tiles/${id}/meta.json`, 'utf8')) as TileMeta;
  const bin = readFileSync(`data/tiles/${id}/heightmap.bin`);
  return {
    meta,
    heights: decodeHeightmap(
      bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
      meta,
    ),
  };
}

describe('F-BUGHUNT-4 audit reproductions', () => {
  // These tests retain measurements of the unfixed findings; they do not certify acceptance.
  it('quantifies the low-tier Blue Hole mesh versus collision/sonar surface', () => {
    const config = makeConfig();
    const terrain = new Terrain(actualTile('great-blue-hole'), config.terrain, 'low');
    try {
      const centre = terrainCarveFor(terrain.meta)!.centre;
      terrain.group.updateMatrixWorld(true);
      const meshes = terrain.group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
      for (const mesh of meshes) mesh.geometry.computeBoundingBox();
      const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
      let worst = { error: 0, x: 0, z: 0, mesh: 0, collision: 0, sonar: 0 };
      let maxBurial = { error: 0, x: 0, z: 0, mesh: 0, collision: 0 };
      for (const oz of [-200, -120, -60, 0, 5, 60, 120, 200]) {
        for (const ox of [-200, -120, -60, 0, 60, 120, 200]) {
          const x = centre.x + ox;
          const z = centre.z + oz;
          const collision = terrain.sampleHeight(x, z);
          const sonar = terrain.sampleDataHeight(x, z);
          expect(Number.isFinite(collision) && Number.isFinite(sonar)).toBe(true);
          ray.ray.origin.set(x, 1000, z);
          const candidates = meshes.filter((m) => {
            const b = m.geometry.boundingBox!;
            return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z;
          });
          const mesh = ray.intersectObjects(candidates, false)[0]!.point.y;
          const error = Math.abs(mesh - collision);
          if (error > worst.error) worst = { error, x, z, mesh, collision, sonar };
          if (mesh - collision > maxBurial.error)
            maxBurial = { error: mesh - collision, x, z, mesh, collision };
        }
      }
      console.log('Blue Hole low-tier surface errors (metres)', { worst, maxBurial });
      // Characterization of the confirmed issue, not an acceptance threshold.
      expect(worst.error).toBeGreaterThan(config.submarine.hullRadius * 2);
      expect(maxBurial.error).toBeGreaterThan(config.submarine.hullRadius * 2);
      const sub = new Submarine(config.submarine, terrain);
      sub.reset(worst.x, -80, worst.z);
      sub.step(
        {
          throttle: 0,
          yaw: 0,
          pitch: 0,
          ballast: 0,
          lookDx: 0,
          lookDy: 0,
          boost: false,
        } as InputState,
        1 / 60,
      );
      expect(sub.getState().touchedBottom).toBe(false);
      expect(sub.position.y + config.submarine.hullRadius).toBeLessThan(worst.mesh);
      console.log('Buried submarine repro', {
        at: worldToLatLon(terrain.meta, worst.x, worst.z),
        y: sub.position.y,
        altitude: sub.getState().altitude,
        hullRadius: config.submarine.hullRadius,
        touchedBottom: sub.getState().touchedBottom,
      });
      for (const [x, z] of [
        [0, 0],
        [-1e9, -1e9],
        [1e9, 1e9],
        [terrain.widthM / 2, terrain.depthM / 2],
        [-terrain.widthM / 2, -terrain.depthM / 2],
        [centre.x, centre.z],
      ])
        expect(Number.isFinite(terrain.sampleDataHeight(x!, z!))).toBe(true);
    } finally {
      terrain.dispose();
    }
  });

  it('reproduces the carved-wall mismatch with procedural detail disabled', () => {
    const config = makeConfig();
    config.terrain.detailStrength = 0;
    const terrain = new Terrain(actualTile('great-blue-hole'), config.terrain, 'low');
    try {
      const centre = terrainCarveFor(terrain.meta)!.centre;
      const x = centre.x + 120;
      const z = centre.z + 5;
      terrain.group.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(x, 1000, z), new THREE.Vector3(0, -1, 0));
      const meshes = terrain.group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
      const mesh = ray.intersectObjects(meshes, false)[0]!.point.y;
      const sampler = terrain.sampleDataHeight(x, z);
      console.log('Blue Hole without procedural detail', { mesh, sampler, error: mesh - sampler });
      expect(terrain.sampleHeight(x, z)).toBe(sampler);
      expect(mesh - sampler).toBeGreaterThan(config.submarine.hullRadius * 2);
    } finally {
      terrain.dispose();
    }
  });

  it('measures the Monterey low-tier wall cost before and after its authored enlargement', () => {
    const config = makeConfig();
    const document = JSON.parse(readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8'));
    const def = parsePropsDoc(document, config.props).props.find(
      (p) => p.id === 'canyon-wall-ledge',
    )!;
    const built = (
      [
        [70, 26, 36],
        [140, 50, 64],
      ] as [number, number, number][]
    ).map((dims) =>
      buildScarp('canyon', {
        dims,
        seed: 123,
        tier: 'low',
        cfg: config.props,
        def,
        groundHeight: () => () => 0,
      }),
    );
    const stats = built.map((b) => {
      let draws = 0;
      let triangles = 0;
      b.full.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        draws++;
        triangles +=
          ((o.geometry.index?.count ?? o.geometry.attributes.position!.count) / 3) *
          (o instanceof THREE.InstancedMesh ? o.count : 1);
      });
      return { draws, triangles };
    });
    console.log('Monterey low-tier wall before/after enlargement', stats);
    expect(stats[1]!.draws).toBe(stats[0]!.draws);
    expect(stats[1]!.triangles).toBeGreaterThan(stats[0]!.triangles * 2);
    const geoms = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    for (const b of built)
      for (const root of [b.full, b.impostor])
        root.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          geoms.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
        });
    geoms.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  });

  it('isolates Blue Hole depth uniforms from Monterey and a second Blue Hole material', () => {
    const config = makeConfig();
    const materials = ['great-blue-hole', 'monterey-canyon', 'great-blue-hole'].map((id) =>
      createTerrainMaterial({
        config: config.terrain,
        tier: 'low',
        biome: biomeFor(id),
        exaggeration: 1,
      }),
    );
    try {
      const u = materials.map((m) => m.material.userData.uniforms);
      expect(u[0].uDepthShade.value.toArray()).toEqual([14, 95]);
      expect(u[1].uDepthShade.value.toArray()).toEqual([0, 0]);
      u[0].uDepthShade.value.set(99, 100);
      u[0].uDepthTint.value.set(0x000000);
      expect(u[1].uDepthShade.value.toArray()).toEqual([0, 0]);
      expect(u[1].uDepthTint.value.getHex()).toBe(0xffffff);
      expect(u[2].uDepthShade.value.toArray()).toEqual([14, 95]);
      expect(u[2].uDepthTint.value.getHex()).not.toBe(0);
    } finally {
      for (const m of materials) {
        m.material.dispose();
        m.textures.forEach((t) => t.dispose());
      }
    }
  });

  it('rejects malformed cell spacing before it can poison height sampling', () => {
    const tile = actualTile('monterey-canyon');
    expect(() =>
      validateMeta({ ...tile.meta, cols: 2, rows: 2, cellsize_m_x: 0 }, tile.meta.id),
    ).toThrow(/cellsize_m_x/);
  });
});
