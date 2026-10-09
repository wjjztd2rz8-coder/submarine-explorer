// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { Props } from '../../src/world/Props.js';
import { validateMeta } from '../../src/world/TileLoader.js';
import { buildScarp } from '../../src/world/props/geo/scarp.js';
import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import beebeDoc from '../../data/landmarks/beebe-vent-field/props.json';
import { parsePropsDoc, type PropDef } from '../../src/world/PropLoader.js';
import { VENT_BUILDERS } from '../../src/world/props/builders/vents.js';
import { tieredSpire } from '../../src/world/props/geo/spire.js';
import { buildCarbonateTower } from '../../src/world/props/geo/towers.js';
import * as shared from '../../src/world/props/geo/shared.js';

afterEach(() => vi.restoreAllMocks());

it('1140: Beebe angular rubble builds silently with finite flat normals on Low', () => {
  const warn = vi.spyOn(console, 'warn');
  const def = parsePropsDoc(beebeDoc, DEFAULT_CONFIG.props).props[0]!;
  const built = VENT_BUILDERS.chimney({
    def,
    dims: def.dimensionsM!,
    seed: shared.hashString(def.id),
    cfg: DEFAULT_CONFIG.props,
    tier: 'low',
    groundHeight: () => (x, z) => x * 0.07 - z * 0.1,
  });
  expect(warn).not.toHaveBeenCalled();
  const rubble = built.full.getObjectByName('beebe-seabed-talus') as THREE.Mesh;
  const g = rubble.geometry;
  expect(g.index).toBeNull();
  for (const attribute of ['position', 'normal', 'color']) {
    expect(Array.from(g.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
  }
  const n = g.getAttribute('normal');
  for (let i = 0; i < n.count; i += 3) {
    expect([n.getX(i), n.getY(i), n.getZ(i)]).toEqual([
      n.getX(i + 1),
      n.getY(i + 1),
      n.getZ(i + 1),
    ]);
    expect([n.getX(i), n.getY(i), n.getZ(i)]).toEqual([
      n.getX(i + 2),
      n.getY(i + 2),
      n.getZ(i + 2),
    ]);
    expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
  }
});

it('1140: Lost City mineral colour remains continuous across the grey-blue blend threshold', () => {
  const seed = 1140;
  const fbm = shared.fbm3;
  let mineral = 0.5 - 1e-6;
  vi.spyOn(shared, 'fbm3').mockImplementation((x, y, z, s, octaves) =>
    s === (seed ^ 0x3b1) ? mineral : fbm(x, y, z, s, octaves),
  );
  const input = {
    def: { id: 'mineral-fixture' } as PropDef,
    dims: [12, 12, 15] as [number, number, number],
    seed,
    cfg: DEFAULT_CONFIG.props,
    tier: 'low',
    groundHeight: () => undefined,
  };
  const a = buildCarbonateTower(input, true);
  mineral = 0.5 + 1e-6;
  const b = buildCarbonateTower(input, true);
  const colors = (built: typeof a) =>
    (built.full.children[0] as THREE.Mesh).geometry.getAttribute('color').array;
  const ca = colors(a),
    cb = colors(b);
  expect(ca.length).toBe(cb.length);
  let maxJump = 0;
  for (let i = 0; i < ca.length; i++) maxJump = Math.max(maxJump, Math.abs(ca[i]! - cb[i]!));
  expect(maxJump).toBeLessThan(0.0001);
});

it.each([false, true])(
  '1140: zero-radius irregular spire tips remain finite (trunk=%s)',
  (trunk) => {
    const g = tieredSpire({
      h: 10,
      r0: 2,
      topFrac: 0,
      seed: 1140,
      segs: 8,
      rings: 4,
      tiers: 3,
      irregular: 1,
      trunk,
    });
    for (const attribute of ['position', 'normal']) {
      expect(Array.from(g.getAttribute(attribute).array).every(Number.isFinite)).toBe(true);
    }
    g.dispose();
  },
);

it.each([
  ['tuff', '44702ddf510f8fb245170a8da6da5651f7a0a1a90c60f41215264ad23f413bdf'],
  ['hadal', '4a0ba159854bd492d2f580d5b156fe70a1f43dfa879a0579d62611b2ea060fed'],
] as const)('1140: Monterey strata preserves f43 %s scarp buffers', (id, baseline) => {
  const built = buildScarp(id, {
    def: { id: '1140-scarp', raw: {} } as PropDef,
    dims: [70, 26, 36],
    seed: 1140,
    cfg: DEFAULT_CONFIG.props,
    tier: 'low',
    groundHeight: () => undefined,
  });
  const buffers: Record<string, string>[] = [];
  built.full.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    buffers.push(
      Object.fromEntries(
        Object.entries(o.geometry.attributes as Record<string, THREE.BufferAttribute>).map(
          ([key, a]) => [key, createHash('sha256').update(a.array).digest('hex')],
        ),
      ),
    );
  });
  expect(createHash('sha256').update(JSON.stringify(buffers)).digest('hex')).toBe(baseline);
});

it.each([
  ['great-blue-hole', 8, 21300],
  ['lost-city', 14, 67472],
  ['beebe-vent-field', 13, 19938],
  ['monterey-canyon', 30, 284010],
] as const)(
  '1140: %s Low buffers are finite and draw counts stay within f43',
  async (site, draws, triangles) => {
    const meta = validateMeta(
      JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')),
      site,
    );
    const props = new Props(
      meta,
      {
        sampleHeight: () => -100,
        getNormal: (_x, _z, out = new THREE.Vector3()) => out.set(0, 1, 0),
      },
      DEFAULT_CONFIG.props,
      'low',
    );
    const stats = await props.placeAll(
      JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')),
      site,
    );
    expect(stats.failed).toBe(0);
    expect(stats.skipped).toBe(0);
    const digest = createHash('sha256');
    const total = { draws: 0, triangles: 0 };
    for (const placed of props.placed) {
      const count = shared.countGeo(placed.full);
      total.draws += count.draws;
      total.triangles += count.triangles;
      for (const root of [placed.full, placed.impostor])
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          for (const [name, attribute] of Object.entries(
            object.geometry.attributes as Record<string, THREE.BufferAttribute>,
          )) {
            expect(
              Array.from(attribute.array).every(Number.isFinite),
              `${placed.def.id}:${name}`,
            ).toBe(true);
            digest.update(name).update(attribute.array);
          }
          if (object.geometry.index) digest.update(object.geometry.index.array);
          if (object instanceof THREE.InstancedMesh) {
            expect(Array.from(object.instanceMatrix.array).every(Number.isFinite)).toBe(true);
            digest.update(object.instanceMatrix.array);
          }
        });
    }
    expect(total.draws).toBe(draws);
    // Beebe's merged rock detail intentionally adds 660 triangles relative to f43.
    expect(total.triangles).toBeLessThanOrEqual(triangles);
    expect({ ...total, buffers: digest.digest('hex') }).toMatchSnapshot();
  },
);
