// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildTitleCrop } from '../../src/render/title/TitleTerrain.js';
import { TITLE_SHOT, TitleScene, type TitleTier } from '../../src/render/title/TitleScene.js';
import { decodeHeightmap, validateMeta } from '../../src/world/TileLoader.js';

const meta = validateMeta(
  JSON.parse(readFileSync('data/tiles/monterey-canyon/meta.json', 'utf8')),
  'monterey-canyon',
);
const bytes = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
const heights = decodeHeightmap(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  meta,
);

function hullWidth(title: TitleScene): number {
  const vehicle = title.scene.getObjectByName('vehicle-B')!;
  const p = new THREE.Vector3();
  const instance = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  let lo = Infinity;
  let hi = -Infinity;
  vehicle.traverseVisible((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const pos = mesh.geometry.getAttribute('position');
    const instanced = mesh as THREE.InstancedMesh;
    for (let j = 0; j < (instanced.isInstancedMesh ? instanced.count : 1); j++) {
      world.copy(o.matrixWorld);
      if (instanced.isInstancedMesh) {
        instanced.getMatrixAt(j, instance);
        world.multiply(instance);
      }
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i).applyMatrix4(world).project(title.camera);
        lo = Math.min(lo, p.x);
        hi = Math.max(hi, p.x);
      }
    }
  });
  return (hi - lo) / 2;
}

describe('TitleScene with checked-in Monterey bathymetry', () => {
  for (const tier of ['low', 'high'] as TitleTier[]) {
    for (const [width, height, layout, silhouette] of [
      [1280, 720, 'desktop', 0.2],
      [390, 844, 'portrait', 0.36],
    ] as const) {
      it(`${tier} ${width}x${height}: frames the real hull and meets geometry budgets`, () => {
        const crop = buildTitleCrop({ meta, heights });
        const title = new TitleScene({ tier, reducedMotion: true });
        try {
          title.setCrop(crop);
          title.resize(width, height, layout);
          expect(hullWidth(title)).toBeCloseTo(silhouette, 3);
          const rig = title.scene.getObjectByName('vehicle-B')!.parent!;
          const centre = rig.position.clone().project(title.camera);
          expect((centre.x + 1) / 2).toBeCloseTo(layout === 'desktop' ? 0.6 : 0.5, 3);
          expect((1 - centre.y) / 2).toBeCloseTo(layout === 'desktop' ? 0.58 : 0.4, 3);
          expect(title.stats.calls).toBeLessThanOrEqual(TITLE_SHOT.budgets[tier].calls);
          expect(title.stats.triangles).toBeLessThanOrEqual(TITLE_SHOT.budgets[tier].triangles);
        } finally {
          title.dispose();
        }
      });
    }
  }

  it('keeps the full 40 s motion above the sampled and rendered seabed, with a clear view of the sub', () => {
    const crop = buildTitleCrop({ meta, heights });
    const title = new TitleScene({ tier: 'low', reducedMotion: false });
    title.setCrop(crop);
    const rig = title.scene.getObjectByName('vehicle-B')!.parent!;
    const ray = new THREE.Raycaster();
    const origin = new THREE.Vector3();
    const down = new THREE.Vector3(0, -1, 0);
    const sight = new THREE.Vector3();
    try {
      // 80 phases cover both sway extrema and the two hover harmonics.
      for (let i = 0; i <= 400; i++) {
        const c = title.camera.position;
        expect(c.y - crop.sampleFloor(c.x, c.z)).toBeGreaterThanOrEqual(TITLE_SHOT.clearanceM);
        expect(rig.position.y - crop.sampleFloor(0, 0)).toBeGreaterThanOrEqual(
          TITLE_SHOT.clearanceM,
        );
        expect(Math.abs(c.x)).toBeLessThan(crop.halfSize);
        expect(Math.abs(c.z)).toBeLessThan(crop.halfSize);
        if (i % 5 === 0) {
          ray.far = Infinity;
          ray.set(origin.set(c.x, 2000, c.z), down);
          const floor = ray.intersectObject(crop.mesh)[0];
          expect(floor).toBeDefined();
          expect(c.y - floor.point.y).toBeGreaterThanOrEqual(TITLE_SHOT.clearanceM);
          sight.copy(rig.position).sub(c);
          ray.far = sight.length();
          ray.set(c, sight.normalize());
          expect(ray.intersectObject(crop.mesh)).toHaveLength(0);
        }
        if (i < 400) title.update(0.1);
      }
    } finally {
      title.dispose();
    }
  });

  it('aims both lamp axes at real sediment within their lighting range', () => {
    const crop = buildTitleCrop({ meta, heights });
    const title = new TitleScene({ tier: 'low', reducedMotion: true });
    title.setCrop(crop);
    const ray = new THREE.Raycaster();
    const origin = new THREE.Vector3();
    const target = new THREE.Vector3();
    try {
      for (const side of [-1, 1]) {
        const lamp = title.scene.getObjectByName(`titleLamp${side}`) as THREE.SpotLight;
        lamp.getWorldPosition(origin);
        lamp.target.getWorldPosition(target);
        ray.far = lamp.distance;
        ray.set(origin, target.sub(origin).normalize());
        const hit = ray.intersectObject(crop.mesh)[0];
        expect(hit).toBeDefined();
        expect(hit.distance).toBeLessThan(lamp.distance);
        expect(Math.abs(hit.point.x)).toBeLessThan(crop.halfSize);
        expect(Math.abs(hit.point.z)).toBeLessThan(crop.halfSize);
      }
    } finally {
      title.dispose();
    }
  });
});
