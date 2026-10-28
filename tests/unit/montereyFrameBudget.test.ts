import { propData } from '../content.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import { Scatter } from '../../src/world/scatter/Scatter.js';
import { hashStringSigned } from '../../src/util/rng.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';

/** Close inspection can show all four banks at once. Opening-only counts miss this peak. */
it('Monterey Medium inspection views include streamed scatter and reserve 225k within the 900k frame budget', async () => {
  const site = 'monterey-canyon';
  const config = makeConfig();
  const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
  const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
  const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
  const terrain = new Terrain({ meta, heights }, config.terrain, 'medium');
  const props = new Props(meta, terrain, config.props, 'medium');
  let scatter: Scatter | undefined;
  try {
    const doc = propData(site);
    await props.placeAll(doc, site);
    expect(props.stats.failed).toBe(0);
    expect(props.stats.skipped).toBe(0);
    expect(props.placed).toHaveLength(doc.props.length);
    // Enable CPU scatter meshes without asking the terrain material to load browser textures.
    const normal = new THREE.Vector3();
    const tier = config.terrain.tiers.medium;
    vi.stubGlobal('document', {});
    scatter = new Scatter({
      biome: terrain.biome,
      ground: {
        sampleHeight: (x, z) => terrain.sampleHeight(x, z),
        contains: (x, z) => terrain.contains(x, z),
        normalAt: (x, z, out) => {
          terrain.getNormal(x, z, normal);
          out[0] = normal.x;
          out[1] = normal.y;
          out[2] = normal.z;
        },
      },
      density: tier.scatterDensity,
      rangeM: tier.scatterRangeM,
      seed: config.terrain.detailSeed ^ hashStringSigned(site),
      rockLo: 1 - Math.cos((config.terrain.rockSlopeLoDeg * Math.PI) / 180),
      rockHi: 1 - Math.cos((config.terrain.rockSlopeHiDeg * Math.PI) / 180),
    });
    vi.unstubAllGlobals();
    const hero = props.placed.find((p) => p.def.id === 'canyon-wall-ledge')!;
    const bounds = hero.localBounds;
    const cx = (bounds.min.x + bounds.max.x) / 2;
    const width = bounds.max.x - bounds.min.x;
    const views = [
      { name: 'wide', range: 10, radius: 70, elevation: 0.25, azimuth: 0.2, side: 0.1 },
      { name: 'toe', range: 4, radius: 22, elevation: 0.12, azimuth: 0.55, side: 0.12 },
      { name: 'oblique', range: 8, radius: 48, elevation: 0.2, azimuth: 1.05, side: 0.2 },
      { name: 'high', range: 6, radius: 75, elevation: 0.6, azimuth: -0.4, side: -0.15 },
      { name: 'cockpit', range: 16, radius: 0, elevation: 0, azimuth: 0, side: 0 },
    ];
    for (const v of views) {
      for (const driftY of [-2, 0, 2]) {
        const rig = new CameraRig(config.camera, 1280 / 720, terrain);
        const position = hero.root.localToWorld(
          new THREE.Vector3(cx + v.side * width, 0, bounds.min.z - v.range),
        );
        const aim = hero.root.localToWorld(new THREE.Vector3(cx, 0, 0));
        position.y =
          Math.min(
            -2,
            terrain.sampleHeight(position.x, position.z) + (v.name === 'cockpit' ? 10 : 8),
          ) + driftY;
        const yaw = Math.atan2(aim.x - position.x, -(aim.z - position.z));
        rig.setMode(v.name === 'cockpit' ? 'first-person' : 'orbit');
        rig.orbitRadius = v.radius;
        rig.orbitElevation = v.elevation;
        rig.orbitAzimuth = Math.atan2(-Math.sin(yaw), Math.cos(yaw)) + v.azimuth;
        rig.snap(position, yaw, v.name === 'cockpit' ? -0.1 : 0);
        terrain.update(rig.camera);
        props.update(rig.camera);
        for (let i = 0; i < 128; i++) scatter.update(rig.camera);
        const frustum = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(
            rig.camera.projectionMatrix,
            rig.camera.matrixWorldInverse,
          ),
        );
        let triangles = terrain.stats.drawnTriangles;
        props.group.updateMatrixWorld(true);
        props.group.traverseVisible((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh || (mesh.frustumCulled && !frustum.intersectsObject(mesh))) return;
          const count = mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count;
          triangles +=
            (count / 3) *
            ((mesh as THREE.InstancedMesh).isInstancedMesh
              ? (mesh as THREE.InstancedMesh).count
              : 1);
        });
        const scatterTriangles = scatter.group.children.reduce((sum, object) => {
          const mesh = object as THREE.InstancedMesh;
          return (
            sum +
            (mesh.count *
              (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count)) /
              3
          );
        }, 0);
        expect(triangles, `${v.name}, vertical drift ${driftY} m`).toBeGreaterThan(100_000);
        // Retain the terrain/prop reserve and count fully streamed pebbles explicitly below.
        expect(triangles + 200_000, `${v.name}, vertical drift ${driftY} m`).toBeLessThan(900_000);
        expect(scatter.stats.cells).toBeGreaterThan(0);
        const pebbles = scatter.group.getObjectByName('scatter:dropstone') as THREE.InstancedMesh;
        expect(pebbles.count).toBeGreaterThan(0);
        // Life, the sub and effects still need headroom after including all scatter draws.
        expect(
          triangles + scatterTriangles + 225_000,
          `${v.name}, vertical drift ${driftY} m`,
        ).toBeLessThan(900_000);
      }
    }
  } finally {
    vi.unstubAllGlobals();
    scatter?.dispose();
    terrain.dispose();
  }
}, 30_000);
