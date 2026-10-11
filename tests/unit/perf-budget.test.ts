// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { ModelCache } from '../../src/world/PropLoader.js';
import { Props } from '../../src/world/Props.js';
import { validateMeta } from '../../src/world/TileLoader.js';

/**
 * Conservative static prop cost: every prop at once, with BOTH internal LOD
 * branches included. Count material groups, transparent double-sided passes
 * and instances. This is a guard on content growth, not a rendered-frame
 * measurement (terrain, vehicles, life, frustum/LOD selection are excluded).
 */
function staticCost(root: THREE.Object3D): { calls: number; triangles: number } {
  let calls = 0;
  let triangles = 0;
  root.traverse((object) => {
    if ((object as THREE.Sprite).isSprite) {
      if ((object as THREE.Sprite).material.visible) {
        calls++;
        triangles += 2;
      }
      return;
    }
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh && !(object as THREE.Points).isPoints && !(object as THREE.Line).isLine)
      return;
    const instances = (mesh as THREE.InstancedMesh).isInstancedMesh
      ? (mesh as THREE.InstancedMesh).count
      : 1;
    if (!instances) return;
    const geometry = mesh.geometry;
    const vertices = geometry.index?.count ?? geometry.getAttribute('position').count;
    const drawStart = geometry.drawRange.start;
    const drawEnd = Math.min(vertices, drawStart + geometry.drawRange.count);
    const add = (material: THREE.Material | undefined, start: number, count: number): void => {
      if (!material?.visible) return;
      const actual = Math.max(0, Math.min(drawEnd, start + count) - Math.max(drawStart, start));
      if (!actual) return;
      const passes =
        mesh.isMesh &&
        material.transparent &&
        material.side === THREE.DoubleSide &&
        !material.forceSinglePass
          ? 2
          : 1;
      calls += passes;
      if (mesh.isMesh) triangles += (actual / 3) * instances * passes;
    };
    if (Array.isArray(mesh.material)) {
      for (const group of geometry.groups)
        add(mesh.material[group.materialIndex ?? 0], group.start, group.count);
    } else add(mesh.material, 0, vertices);
  });
  return { calls, triangles };
}

const sites = (
  JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')) as { landmarks: string[] }
).landmarks;

/** Read actual GLB geometry/materials; image decoding is irrelevant to this census. */
async function localModel(url: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  loader.register(() => ({
    name: 'static-census-textures',
    loadTexture: async () => new THREE.Texture(),
  }));
  const bytes = readFileSync(`public${url}`);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await loader.parseAsync(buffer, '')).scene;
}
const diagnostics =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.PERF_BUDGET_STATIC === '1';
const rows: Array<{ site: string; tier: string; calls: number; triangles: number }> = [];

afterAll(() => {
  if (!diagnostics) return;
  mkdirSync('.cache/perf-budget', { recursive: true });
  writeFileSync('.cache/perf-budget/static.json', JSON.stringify(rows, null, 2));
});

describe('catalog site static prop budgets', () => {
  for (const site of sites) {
    for (const tier of diagnostics ? (['low', 'high'] as const) : (['low'] as const)) {
      it(`${site} ${tier}: bounds prop draw calls and triangles before culling`, async () => {
        const meta = validateMeta(
          JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')),
          site,
        );
        const doc: unknown = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
        const props = new Props(
          meta,
          {
            sampleHeight: () => -100,
            getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
          },
          DEFAULT_CONFIG.props,
          tier,
        );
        // Blake includes two real GLB rocks. Avoid network/DOM image loaders,
        // while preserving the shipped mesh, material sides and placement path.
        const models = vi.spyOn(ModelCache.prototype, 'get').mockImplementation(localModel);
        try {
          const stats = await props.placeAll(doc, site);
          expect(stats.failed).toBe(0);
          expect(stats.skipped).toBe(0);
          expect(stats.count).toBeGreaterThan(0);
          if (site === 'blake-plateau-corals') expect(stats.models).toBe(2);
          else expect(stats.models).toBe(0); // The other documents use procedural content.
          const totals = { calls: 0, triangles: 0 };
          for (const placed of props.placed) {
            const cost = staticCost(placed.full);
            totals.calls += cost.calls;
            totals.triangles += cost.triangles;
          }
          if (diagnostics) rows.push({ site, tier, ...totals });
          expect(totals.calls).toBeGreaterThan(0);
          expect(totals.triangles).toBeGreaterThan(0);
          if (tier === 'low') {
            // Reserve 300 calls / 300k triangles of the frame budget for the rest
            // of the scene; the e2e guard checks the actual full-frame budget.
            expect(totals.calls).toBeLessThanOrEqual(1200);
            expect(totals.triangles).toBeLessThanOrEqual(1_200_000);
          }
        } finally {
          models.mockRestore();
        }
      });
    }
  }
});
