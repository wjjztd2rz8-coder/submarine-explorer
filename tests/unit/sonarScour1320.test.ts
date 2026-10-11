// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { Sonar } from '../../src/ui/Sonar.js';
import { Terrain } from '../../src/world/Terrain.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { recordSonarCanvas } from './helpers/sonarCanvas.js';

afterEach(() => vi.unstubAllGlobals());

function render(id: string, hull: boolean, dpr = 1) {
  vi.unstubAllGlobals();
  const meta = JSON.parse(readFileSync('data/tiles/endurance/meta.json', 'utf8')) as TileMeta;
  const bytes = readFileSync('data/tiles/endurance/heightmap.bin');
  const terrain = new Terrain(
    {
      meta: { ...meta, id },
      heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows),
    },
    DEFAULT_CONFIG.terrain,
    'low',
  );
  const recorded = recordSonarCanvas();
  vi.stubGlobal('document', recorded.document);
  vi.stubGlobal('devicePixelRatio', dpr);
  const centre = latLonToWorld(meta, -68.739167, -52.329722);
  const sonar = new Sonar(terrain);
  if (hull)
    sonar.setPois([
      {
        id: 'endurance-hull',
        position: new Vector3(centre.x, -2995, centre.z),
        radius: 60,
      } as PlacedPoi,
    ]);
  const internals = sonar as unknown as {
    renderBathymetry(x: number, z: number): void;
    relief: { minDepthM: number; maxDepthM: number; contourIntervalM: number };
  };
  const surveyBefore = terrain.sampleDataHeight(centre.x, centre.z);
  internals.renderBathymetry(centre.x + 80, centre.z + 40);
  expect(terrain.sampleDataHeight(centre.x, centre.z)).toBe(surveyBefore);
  terrain.dispose();
  return { ...recorded, relief: internals.relief };
}

describe('1320 Endurance sonar scour contours', () => {
  for (const dpr of [1, 2]) {
    it(`DPR ${dpr}: irregular contours stay near the hull and preserve measured depth limits`, () => {
      const plain = render('endurance', false, dpr);
      const scour = render('endurance', true, dpr);
      expect(scour.relief.minDepthM).toBe(plain.relief.minDepthM);
      expect(scour.relief.maxDepthM).toBe(plain.relief.maxDepthM);
      expect(Number.isFinite(scour.relief.contourIntervalM)).toBe(true);
      const paths = scour.paths.filter((path) => path.points.length > 0);
      expect(paths.length).toBeGreaterThan(1);
      for (const path of paths) {
        for (const axis of [0, 1]) {
          const coords = path.points.map((p) => p[axis]);
          expect(Math.max(...coords) - Math.min(...coords)).toBeLessThan(220 * 0.55);
        }
      }
      // Relative authored relief is never labeled as an absolute surveyed depth.
      expect(scour.labels).toEqual([]);
      expect(plain.labels.length).toBeGreaterThan(0);
      expect(scour.paths).not.toEqual(plain.paths);
    });
  }

  it('keeps the generic renderer identical without an Endurance hull', () => {
    const plain = render('endurance', false);
    const other = render('test', true);
    expect(other.rasters[0].data).toEqual(plain.rasters[0].data);
    expect(other.paths).toEqual(plain.paths);
    expect(other.labels).toEqual(plain.labels);
  });
});
