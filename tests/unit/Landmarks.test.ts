import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import { Landmarks, extractLandmarks } from '../../src/world/Landmarks.js';
import { Terrain } from '../../src/world/Terrain.js';
import { makeSyntheticTile } from './helpers.js';

const tile = makeSyntheticTile({ cols: 16, rows: 16, centerLat: 41.73, centerLon: -49.95 });
const terrain = new Terrain(tile, DEFAULT_CONFIG.terrain);

describe('extractLandmarks', () => {
  const item = { id: 'a', lat: 1, lon: 2 };

  it('accepts a bare array', () => {
    expect(extractLandmarks([item])).toHaveLength(1);
  });

  it('accepts { landmarks: [...] } (the shape data/landmarks.json uses)', () => {
    expect(extractLandmarks({ version: 1, landmarks: [item] })).toHaveLength(1);
  });

  it('accepts an id-keyed object', () => {
    expect(extractLandmarks({ a: { lat: 1, lon: 2 } })[0]?.id).toBe('a');
  });

  it('accepts a GeoJSON FeatureCollection', () => {
    const out = extractLandmarks({
      features: [{ properties: { id: 'a' }, geometry: { coordinates: [2, 1] } }],
    });
    expect(out[0]).toMatchObject({ id: 'a', lat: 1, lon: 2 });
  });

  it('drops entries without numeric coordinates, and junk input', () => {
    expect(extractLandmarks([{ id: 'a' }, null, 5])).toHaveLength(0);
    expect(extractLandmarks(null)).toEqual([]);
    expect(extractLandmarks('nope')).toEqual([]);
  });
});

describe('Landmarks.place', () => {
  it('only places landmarks inside the tile bbox', () => {
    const lm = new Landmarks(tile.meta);
    const placed = lm.place(
      [
        { id: 'inside', lat: tile.meta.center.lat, lon: tile.meta.center.lon },
        { id: 'outside', lat: 0, lon: 0 },
      ],
      terrain,
    );
    expect(placed.map((p) => p.landmark.id)).toEqual(['inside']);
  });

  it('treats a positive depth_m as a depth below sea level', () => {
    const lm = new Landmarks(tile.meta);
    const [placed] = lm.place(
      [{ id: 'x', lat: tile.meta.center.lat, lon: tile.meta.center.lon, depth_m: 800 }],
      terrain,
    );
    // -800 plus the 12 m marker lift.
    expect(placed?.position.y).toBeCloseTo(-788, 5);
  });

  it('sits a landmark on the seabed when it has no depth', () => {
    const lm = new Landmarks(tile.meta);
    const [placed] = lm.place(
      [{ id: 'x', lat: tile.meta.center.lat, lon: tile.meta.center.lon }],
      terrain,
    );
    expect(placed?.position.y).toBeCloseTo(terrain.sampleHeight(0, 0) + 12, 3);
  });
});
