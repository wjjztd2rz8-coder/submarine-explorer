// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { createHash } from 'node:crypto';
import { Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type SonarPaletteName, type SonarZoom } from '../../src/core/Config.js';
import * as manifests from '../../src/core/SiteManifest.js';
import type { PlacedPoi } from '../../src/game/Pois.js';
import { Sonar } from '../../src/ui/Sonar.js';
import { Terrain } from '../../src/world/Terrain.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { recordSonarCanvas } from './helpers/sonarCanvas.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function render(
  id: string,
  hull: boolean,
  dpr = 1,
  tileId = 'endurance',
  zoom: SonarZoom = DEFAULT_CONFIG.sonarZoom.initial,
  palette: SonarPaletteName = 'default',
  policySiteId = id,
  hullId = 'endurance-hull',
) {
  vi.unstubAllGlobals();
  const meta = JSON.parse(readFileSync(`data/tiles/${tileId}/meta.json`, 'utf8')) as TileMeta;
  const bytes = readFileSync(`data/tiles/${tileId}/heightmap.bin`);
  const terrain = new Terrain(
    {
      meta: { ...meta, id },
      heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows),
    },
    DEFAULT_CONFIG.terrain,
    'low',
  );
  const recorded = recordSonarCanvas();
  // Keep the survey and carve fixed when testing another sonar policy identity.
  terrain.meta.id = policySiteId;
  vi.stubGlobal('document', recorded.document);
  vi.stubGlobal('devicePixelRatio', dpr);
  const centre = latLonToWorld(meta, -68.739167, -52.329722);
  const sonar = new Sonar(terrain, [], {
    zoom: { ...DEFAULT_CONFIG.sonarZoom, initial: zoom },
    palette,
  });
  if (hull)
    sonar.setPois([
      {
        id: hullId,
        position: new Vector3(centre.x, -2995, centre.z),
        radius: 60,
      } as PlacedPoi,
    ]);
  const internals = sonar as unknown as {
    renderBathymetry(x: number, z: number): void;
    relief: { minDepthM: number; maxDepthM: number; contourIntervalM: number };
  };
  const surveyBefore = terrain.sampleDataHeight(centre.x, centre.z);
  internals.renderBathymetry(
    tileId === 'endurance' ? centre.x + 80 : 0,
    tileId === 'endurance' ? centre.z + 40 : 0,
  );
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

describe('sonar rendering equivalence', () => {
  // Guards accidental scour/reef leakage onto any site without authored policy.
  it.each([
    ...manifests
      .allSiteManifests()
      .filter((site) => !site.sonar)
      .map((site) => site.id),
    'unknown',
  ])('%s retains generic pixels, contours and measured depths even with a hull contact', (id) => {
    const generic = render('endurance', true, 1, 'endurance', 250, 'default', 'unknown');
    const actual = render('endurance', true, 1, 'endurance', 250, 'default', id);
    expect(actual.rasters[0].data).toEqual(generic.rasters[0].data);
    expect(actual.paths).toEqual(generic.paths);
    expect(actual.labels).toEqual(generic.labels);
    expect(actual.relief).toEqual(generic.relief);
  });

  it('anchors scour to the configured POI rather than a hardcoded hull identity', () => {
    const authored = render('endurance', true);
    vi.spyOn(manifests, 'siteManifest').mockReturnValue({
      id: 'fixture',
      sonar: { scourHullPoi: 'fixture-hull' },
    });
    const renamed = render(
      'endurance',
      true,
      1,
      'endurance',
      DEFAULT_CONFIG.sonarZoom.initial,
      'default',
      'fixture',
      'fixture-hull',
    );
    expect(renamed.rasters[0].data).toEqual(authored.rasters[0].data);
    expect(renamed.paths).toEqual(authored.paths);
    expect(renamed.labels).toEqual(authored.labels);
    expect(renamed.relief).toEqual(authored.relief);
    const missing = render('endurance', true);
    expect(missing.paths).not.toEqual(renamed.paths);
    expect(missing.labels.length).toBeGreaterThan(0);
  });

  it.each([
    ['endurance', true, 'endurance'],
    ['great-blue-hole', false, 'great-blue-hole'],
  ] as const)('selects %s rendering through policy on another site', (id, hull, tileId) => {
    const authored = render(id, hull, 1, tileId);
    const policy = manifests.siteManifest(id)!.sonar;
    const lookup = manifests.siteManifest;
    // Relocate sonar policy while retaining the survey's authored terrain reconstruction.
    vi.spyOn(manifests, 'siteManifest').mockImplementation((site) =>
      site === 'unknown' ? { id: site, sonar: policy } : lookup(site),
    );
    const relocated = render(
      id,
      hull,
      1,
      tileId,
      DEFAULT_CONFIG.sonarZoom.initial,
      'default',
      'unknown',
    );
    expect(
      relocated.rasters[0].data.every((value, index) => value === authored.rasters[0].data[index]),
    ).toBe(true);
    expect(relocated.paths).toEqual(authored.paths);
    expect(relocated.labels).toEqual(authored.labels);
    expect(relocated.relief).toEqual(authored.relief);
  });

  it('uses generic relief when a known site omits its sonar policy', () => {
    const generic = render('unknown', true);
    vi.spyOn(manifests, 'siteManifest').mockReturnValue({ id: 'endurance' });
    const omitted = render('endurance', true);
    expect(omitted.rasters[0].data).toEqual(generic.rasters[0].data);
    expect(omitted.paths).toEqual(generic.paths);
    expect(omitted.labels).toEqual(generic.labels);
  });

  // Frozen before moving site policy: protects pixels, contours, labels and depth limits.
  for (const dpr of [1, 2]) {
    for (const zoom of [250, 1000, 'tile'] as const) {
      it.each([
        ['endurance', true, 'endurance', 'default'],
        ['endurance', false, 'endurance', 'highContrast'],
        ['unknown', true, 'endurance', 'deuteranopia'],
        ['great-blue-hole', false, 'great-blue-hole', 'default'],
        ['great-blue-hole', false, 'great-blue-hole', 'highContrast'],
        ['great-blue-hole', false, 'endurance', 'deuteranopia'],
      ] as const)(
        'preserves %s hull=%s survey=%s palette=%s at DPR ' + dpr + ' zoom ' + zoom,
        (id, hull, tileId, palette) => {
          const { rasters, paths, labels, relief } = render(id, hull, dpr, tileId, zoom, palette);
          const image = rasters[0];
          const hash = (value: Uint8ClampedArray | string) =>
            createHash('sha256').update(value).digest('hex');
          expect({
            width: image.width,
            height: image.height,
            pixels: hash(image.data),
            contours: hash(JSON.stringify(paths)),
            labels: hash(JSON.stringify(labels)),
            relief,
          }).toMatchSnapshot();
        },
      );
    }
  }
});
