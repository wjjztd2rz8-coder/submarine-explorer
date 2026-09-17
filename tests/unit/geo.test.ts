import { describe, expect, it } from 'vitest';
import {
  METERS_PER_DEG_LAT,
  bboxContains,
  headingFromForward,
  latLonToWorld,
  metersPerDegLon,
  normalizeHeadingDeg,
  tileHeightMeters,
  tileWidthMeters,
  worldToLatLon,
} from '../../src/util/geo.js';
import { makeSyntheticTile } from './helpers.js';

const { meta } = makeSyntheticTile({ centerLat: 41.73, centerLon: -49.95 });

describe('geo', () => {
  it('maps the tile centre to the world origin', () => {
    const w = latLonToWorld(meta, meta.center.lat, meta.center.lon);
    expect(w.x).toBeCloseTo(0, 9);
    expect(w.z).toBeCloseTo(0, 9);
  });

  it('puts east at +X and north at -Z', () => {
    const east = latLonToWorld(meta, meta.center.lat, meta.center.lon + 0.01);
    expect(east.x).toBeGreaterThan(0);
    expect(east.z).toBeCloseTo(0, 9);

    const north = latLonToWorld(meta, meta.center.lat + 0.01, meta.center.lon);
    // +Z is SOUTH, so going north must give a NEGATIVE z.
    expect(north.z).toBeLessThan(0);
    expect(north.x).toBeCloseTo(0, 9);
  });

  it('uses the documented metres-per-degree scales', () => {
    const north = latLonToWorld(meta, meta.center.lat + 1, meta.center.lon);
    expect(-north.z).toBeCloseTo(METERS_PER_DEG_LAT, 6);

    const east = latLonToWorld(meta, meta.center.lat, meta.center.lon + 1);
    expect(east.x).toBeCloseTo(metersPerDegLon(meta.center.lat), 6);
  });

  it('shrinks longitude with the cosine of latitude', () => {
    expect(metersPerDegLon(0)).toBeCloseTo(METERS_PER_DEG_LAT, 6);
    expect(metersPerDegLon(60)).toBeCloseTo(METERS_PER_DEG_LAT / 2, 3);
    expect(metersPerDegLon(90)).toBeCloseTo(0, 6);
  });

  it('round-trips lat/lon -> world -> lat/lon', () => {
    for (const [lat, lon] of [
      [41.73, -49.95],
      [41.88, -50.1],
      [41.6, -49.8],
    ] as const) {
      const w = latLonToWorld(meta, lat, lon);
      const back = worldToLatLon(meta, w.x, w.z);
      expect(back.lat).toBeCloseTo(lat, 9);
      expect(back.lon).toBeCloseTo(lon, 9);
    }
  });

  it('round-trips world -> lat/lon -> world', () => {
    for (const [x, z] of [
      [0, 0],
      [1234.5, -987.6],
      [-5000, 5000],
    ] as const) {
      const ll = worldToLatLon(meta, x, z);
      const back = latLonToWorld(meta, ll.lat, ll.lon);
      expect(back.x).toBeCloseTo(x, 6);
      expect(back.z).toBeCloseTo(z, 6);
    }
  });

  it('computes tile extent from the grid size', () => {
    expect(tileWidthMeters(meta)).toBeCloseTo(meta.cols * meta.cellsize_m_x, 9);
    expect(tileHeightMeters(meta)).toBeCloseTo(meta.rows * meta.cellsize_m_y, 9);
  });

  it('tests bbox containment', () => {
    expect(bboxContains(meta.bbox, meta.center.lat, meta.center.lon)).toBe(true);
    expect(bboxContains(meta.bbox, meta.bbox.north + 1, meta.center.lon)).toBe(false);
    expect(bboxContains(meta.bbox, meta.center.lat, meta.bbox.west - 1)).toBe(false);
    // Edges are inclusive.
    expect(bboxContains(meta.bbox, meta.bbox.north, meta.bbox.east)).toBe(true);
  });

  it('derives compass headings from a forward vector', () => {
    expect(headingFromForward(0, -1)).toBeCloseTo(0, 6); // north = -Z
    expect(headingFromForward(1, 0)).toBeCloseTo(90, 6); // east  = +X
    expect(headingFromForward(0, 1)).toBeCloseTo(180, 6); // south = +Z
    expect(headingFromForward(-1, 0)).toBeCloseTo(270, 6); // west = -X
  });

  it('normalises headings into [0,360)', () => {
    expect(normalizeHeadingDeg(-90)).toBeCloseTo(270, 9);
    expect(normalizeHeadingDeg(450)).toBeCloseTo(90, 9);
    expect(normalizeHeadingDeg(360)).toBeCloseTo(0, 9);
  });
});
