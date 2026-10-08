// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import meta from '../../data/tiles/beebe-vent-field/meta.json';
import doc from '../../data/landmarks/beebe-vent-field/props.json';
import { makeConfig } from '../../src/core/Config.js';
import { Props, followsTerrain } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

for (const tier of ['low', 'high'] as const) {
  it(`${tier}: Beebe clumps follow the placed smoker's supporting surface without footprint sinking`, async () => {
    const cfg = makeConfig();
    const bytes = readFileSync('data/tiles/beebe-vent-field/heightmap.bin');
    const heights = new Float32Array(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    );
    const terrain = new Terrain({ meta, heights }, cfg.terrain, tier);
    const props = new Props(meta, terrain, cfg.props, tier);
    try {
      await props.placeAll(doc, meta.id);
      expect(props.stats.failed).toBe(0);
      props.group.updateMatrixWorld(true);
      terrain.group.updateMatrixWorld(true);
      for (const prop of props.placed) {
        expect(followsTerrain(prop.def)).toBe(true);
        const origin = prop.root.position;
        expect(origin.y).toBeCloseTo(terrain.sampleHeight(origin.x, origin.z), 5);
        const mesh = prop.full.getObjectByName('beebe-flow-habitat')!;
        const apron = prop.full.getObjectByName('beebe-mineral-seabed');
        for (const anchor of mesh.userData.anchors as number[][]) {
          const point = prop.root.localToWorld(new THREE.Vector3().fromArray(anchor));
          const ray = new THREE.Raycaster(
            point.clone().add(new THREE.Vector3(0, 10, 0)),
            new THREE.Vector3(0, -1, 0),
          );
          const hit = apron ? ray.intersectObject(apron)[0] : undefined;
          if (apron) {
            expect(point.y).toBeCloseTo(
              Math.max(terrain.sampleHeight(point.x, point.z), hit?.point.y ?? -Infinity),
              4,
            );
          } else {
            const floor = ray.intersectObject(terrain.group, true)[0]!;
            expect(floor).toBeDefined();
            expect(point.y).toBeCloseTo(floor.point.y, 5);
          }
        }
        if (prop.def.id !== 'beebe-chimney-1') {
          const other = { ...prop.def, id: 'axial-smoker' };
          expect(followsTerrain(other)).toBe(false);
          expect(
            followsTerrain({ ...prop.def, raw: { ...prop.def.raw, beebe_habitat: undefined } }),
          ).toBe(false);
        }
      }
    } finally {
      terrain.dispose();
    }
  });
}
