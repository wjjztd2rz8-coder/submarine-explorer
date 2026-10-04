// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import { decodeHeightmap } from '../../src/world/TileLoader.js';
import type { TileMeta } from '../../src/util/types.js';

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
