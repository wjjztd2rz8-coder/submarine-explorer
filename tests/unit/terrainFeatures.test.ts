import { afterEach, describe, expect, it, vi } from 'vitest';
import * as manifests from '../../src/core/SiteManifest.js';
import {
  terrainCarveFor,
  BLUE_HOLE_RADIUS_M,
  blueHoleTint,
} from '../../src/world/terrainFeatures.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import type { TileMeta } from '../../src/util/types.js';

const meta = {
  id: 'great-blue-hole',
  center: { lat: 17.31519753916774, lon: -87.53411865234375 },
} as unknown as TileMeta;

describe('Blue Hole carve', () => {
  const carve = terrainCarveFor(meta)!;
  const { x, z } = carve.centre;
  it('leaves sites without a reconstruction unchanged', () => {
    expect(terrainCarveFor({ ...meta, id: 'titanic' } as TileMeta)).toBeNull();
  });
  it('digs a ~125 m deep hole under a 4 m deep shelf and leaves the shelf alone outside', () => {
    expect(carve.apply(x, z, -4)).toBeLessThan(-120);
    expect(carve.apply(x + BLUE_HOLE_RADIUS_M * 2, z, -4)).toBe(-4);
    expect(carve.apply(x + 300, z, -4)).toBe(-4);
  });
  it('never raises the seabed', () => {
    for (const r of [0, 60, 120, 150, 175, 200, 230]) {
      expect(carve.apply(x + r, z, -500)).toBe(-500);
    }
  });
  it('has a ledge near 40 m', () => {
    const h = carve.apply(x + 140, z, -4);
    expect(h).toBeLessThan(-30);
    expect(h).toBeGreaterThan(-50);
  });
});

describe('terrain carve policy', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['monterey-canyon', 'great-blue-hole'])(
    '%s resolves policy once and keeps independent carves deterministic',
    (id) => {
      // Sampling must not re-resolve policy or depend on which tile was built last.
      const tile = JSON.parse(readFileSync(`data/tiles/${id}/meta.json`, 'utf8')) as TileMeta;
      const before = JSON.stringify(tile);
      const lookup = vi.spyOn(manifests, 'siteManifest');
      const carve = terrainCarveFor(tile)!;
      expect(lookup).toHaveBeenCalledExactlyOnceWith(id);
      const points = [-621, -450, 0, 450, 621].flatMap((dz) =>
        [-231, -160, -90, 0, 90, 160, 231].flatMap((dx) =>
          [-4, -100, -800, -1100].map((height) => ({
            x: carve.centre.x + dx,
            z: carve.centre.z + dz,
            height,
          })),
        ),
      );
      const sample = () => points.map(({ x, z, height }) => carve.apply(x, z, height));
      const original = sample();
      expect(lookup).toHaveBeenCalledTimes(1);
      const shifted = terrainCarveFor({
        ...tile,
        center: { lat: tile.center.lat + 0.001, lon: tile.center.lon - 0.001 },
      })!;
      expect(shifted.centre).not.toEqual(carve.centre);
      expect(sample()).toEqual(original);
      expect([...points].reverse().map(({ x, z, height }) => carve.apply(x, z, height))).toEqual(
        [...original].reverse(),
      );
      for (const [i, height] of original.entries()) {
        expect(Number.isFinite(height)).toBe(true);
        expect(height).toBeLessThanOrEqual(points[i].height);
      }
      expect(lookup).toHaveBeenCalledTimes(2);
      expect(JSON.stringify(tile)).toBe(before);
    },
  );

  it.each([
    ...manifests
      .allSiteManifests()
      .filter((site) => !site.terrain?.carve)
      .map((site) => site.id),
    'unknown',
  ])('%s remains uncarved at a reconstruction coordinate', (id) => {
    // Geographic proximity cannot opt an unconfigured site into a reconstruction.
    expect(terrainCarveFor({ ...meta, id })).toBeNull();
  });

  it.each(['monterey-canyon', 'great-blue-hole'])(
    '%s reconstruction follows policy on an unknown site',
    (id) => {
      // Guard against reintroducing site identity checks in the shared terrain path.
      const tile = JSON.parse(readFileSync(`data/tiles/${id}/meta.json`, 'utf8')) as TileMeta;
      const original = terrainCarveFor(tile)!;
      const terrain = manifests.siteManifest(id)!.terrain;
      vi.spyOn(manifests, 'siteManifest').mockImplementation((id) => ({ id, terrain }));
      const moved = terrainCarveFor({ ...tile, id: 'unknown' })!;
      expect(moved.centre).toEqual(original.centre);
      for (const dx of [-240, -160, -90, 0, 30, 140, 215, 231])
        for (const dz of [-621, -450, 0, 450, 619, 620]) {
          const x = original.centre.x + dx;
          const z = original.centre.z + dz;
          expect(moved.apply(x, z, -4)).toBe(original.apply(x, z, -4));
        }
    },
  );

  it.each([undefined, {}, { terrain: {} }])(
    'does not infer a carve without policy %j',
    (policy) => {
      vi.spyOn(manifests, 'siteManifest').mockImplementation((id) =>
        policy ? { id, ...policy } : undefined,
      );
      for (const id of ['monterey-canyon', 'great-blue-hole', 'unknown'])
        expect(terrainCarveFor({ ...meta, id })).toBeNull();
    },
  );
});

describe('terrain carve equivalence', () => {
  for (const id of ['monterey-canyon', 'great-blue-hole']) {
    for (const shifted of [false, true]) {
      it(`${id}, shifted tile centre ${shifted}: preserves heights and vertex tint`, () => {
        // Freeze the original reconstruction across floors, banks, alcoves and falloff edges.
        // A shifted tile also guards the conversion from geographic to local coordinates.
        const tile = JSON.parse(readFileSync(`data/tiles/${id}/meta.json`, 'utf8')) as TileMeta;
        if (shifted) tile.center = { lat: tile.center.lat + 0.001, lon: tile.center.lon - 0.001 };
        const carve = terrainCarveFor(tile)!;
        const heights: number[] = [];
        const tint: number[] = [];
        for (let dz = -650; dz <= 650; dz += 5) {
          for (let dx = -250; dx <= 250; dx += 5) {
            const x = carve.centre.x + dx;
            const z = carve.centre.z + dz;
            for (const measured of [-4, -100, -800, -1100]) {
              const y = carve.apply(x, z, measured);
              heights.push(y);
              if (id === 'great-blue-hole') {
                for (const normalY of [0, 0.5, 1]) tint.push(...blueHoleTint(x, y, z, normalY));
              }
            }
          }
        }
        const hash = (values: number[]) =>
          createHash('sha256').update(JSON.stringify(values)).digest('hex');
        expect({
          centre: carve.centre,
          heightSamples: heights.length,
          heights: hash(heights),
          tint: hash(tint),
        }).toMatchSnapshot();
      });
    }
  }
});
