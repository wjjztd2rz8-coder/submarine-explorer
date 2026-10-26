// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import { decodeHeightmap } from '../../src/world/TileLoader.js';
import type { TileMeta } from '../../src/util/types.js';

// Contact checks need the real survey mesh and props, but never read vertex colors.
// Avoid coloring the entire tile while retaining its topology and height sampling.
vi.mock('../../src/world/TerrainBiome.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/world/TerrainBiome.js')>();
  return {
    ...actual,
    biomeFor: (id: string) => ({ ...actual.biomeFor(id), vertexTint: undefined }),
  };
});

// Validate contacts against exposed survey-backed wall triangles at every tier.
describe.each([
  { tier: 'medium', bank: 'east', x: -111.36363636363637, y: 167.02843730848141 },
  { tier: 'high', bank: 'west', x: -18.181818181818187, y: 126.9591006339439 },
  { tier: 'medium', bank: 'west', x: -18.181818181818187, y: 127.23810102354102 },
  { tier: 'low', bank: 'west', x: -160, y: 147.57527326112694 },
] as const)('$tier $bank upper-wall contact', ({ tier, bank, x, y }) => {
  let collides: boolean;

  beforeAll(async () => {
    const meta = JSON.parse(
      readFileSync('data/tiles/monterey-canyon/meta.json', 'utf8'),
    ) as TileMeta;
    const bytes = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      DEFAULT_CONFIG.terrain,
      tier,
    );
    const props = new Props(meta, terrain, DEFAULT_CONFIG.props, tier);
    try {
      const content = JSON.parse(readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8'));
      await props.load('props.json', meta.id, async () => content);
      expect(props.stats.failed).toBe(0);
      expect(props.placed).toHaveLength(content.props.length);
      const bankProp = props.placed.find((p) => p.def.id === `canyon-wall-${bank}`)!;
      bankProp.root.updateMatrixWorld(true);
      const wall = bankProp.full.children[0] as THREE.Mesh;
      wall.geometry.computeBoundingBox();
      const ray = new THREE.Raycaster(
        wall.localToWorld(new THREE.Vector3(x, y, wall.geometry.boundingBox!.min.z - 1)),
        new THREE.Vector3(0, 0, 1).transformDirection(wall.matrixWorld),
      );
      const hit = ray.intersectObject(wall, false)[0];
      expect(hit).toBeDefined();
      expect(hit.face!.normal.z).toBeLessThan(-0.25);
      expect(hit.point.y).toBeLessThan(0);
      expect(hit.point.y - terrain.sampleHeight(hit.point.x, hit.point.z)).toBeGreaterThan(100);
      // The shipped 8 m hull is centred on a ray hit on an actual triangle.
      expect(DEFAULT_CONFIG.submarine.hullRadius).toBe(8);
      collides = props.collide(
        hit.point.clone(),
        DEFAULT_CONFIG.submarine.hullRadius,
        new THREE.Vector3(),
      );
    } finally {
      props.dispose();
      terrain.dispose();
    }
  }, 60_000); // builds a real tile and prop set; slow hosted runners need headroom

  it('the hull must collide at the exposed triangle', () => {
    expect(collides).toBe(true);
  });
});

it('Monterey wall instances sit above the real sloping seabed', async () => {
  const meta = JSON.parse(readFileSync('data/tiles/monterey-canyon/meta.json', 'utf8')) as TileMeta;
  const bin = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
  const terrain = new Terrain(
    {
      meta,
      heights: decodeHeightmap(
        bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength),
        meta,
      ),
    },
    DEFAULT_CONFIG.terrain,
    'low',
  );
  const props = new Props(meta, terrain, DEFAULT_CONFIG.props, 'medium');
  try {
    const doc = JSON.parse(readFileSync('data/landmarks/monterey-canyon/props.json', 'utf8'));
    await props.placeAll(
      { ...doc, props: doc.props.filter((p: { id: string }) => p.id === 'canyon-wall-ledge') },
      'monterey-canyon',
    );
    const prop = props.placed[0]!;
    prop.root.updateMatrixWorld(true);
    const matrix = new THREE.Matrix4();
    const worldMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    let lifeCount = 0;
    prop.full.traverse((object) => {
      const mesh = object as THREE.InstancedMesh;
      if (!mesh.isInstancedMesh) return;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        worldMatrix.multiplyMatrices(prop.root.matrixWorld, matrix);
        position.setFromMatrixPosition(worldMatrix);
        const distance = position.y - terrain.sampleHeight(position.x, position.z);
        min = Math.min(min, distance);
        max = Math.max(max, distance);
        if (/^wall-(sponges|corals)-/.test(mesh.name)) {
          lifeCount++;
          expect(distance, `${mesh.name} attachment is above the local seabed`).toBeGreaterThan(0);
        }
        count++;
      }
    });
    expect(lifeCount).toBeGreaterThan(20);
    expect(count).toBeGreaterThan(20);
    expect(min).toBeGreaterThan(-3);
    expect(max).toBeLessThan((prop.localBounds.max.y - prop.localBounds.min.y) * 0.5);
  } finally {
    terrain.dispose();
  }
});
