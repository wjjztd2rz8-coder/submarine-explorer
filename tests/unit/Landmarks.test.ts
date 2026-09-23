import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import {
  Landmarks,
  extractLandmarks,
  fadeByDistance,
  labelScaleForPixels,
  truncateLabel,
} from '../../src/world/Landmarks.js';
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

describe('landmark label maths (QA-B #1)', () => {
  it('leaves short names alone and cuts long ones to maxChars with an ellipsis', () => {
    expect(truncateLabel('RMS Titanic', 28)).toBe('RMS Titanic');
    const long = 'Hydrothermal Vent Field (Von Damm)';
    const cut = truncateLabel(long, 28);
    expect(Array.from(cut)).toHaveLength(28);
    expect(cut.endsWith('\u2026')).toBe(true);
    expect(cut.startsWith('Hydrothermal Vent Field')).toBe(true);
    // Exactly at the limit is not cut.
    expect(truncateLabel('x'.repeat(28), 28)).toBe('x'.repeat(28));
  });

  it('does not leave a dangling space before the ellipsis', () => {
    expect(truncateLabel('abcd efgh', 6)).toBe('abcd\u2026');
  });

  it('fades from 0 inside near to 1 beyond far, monotonically', () => {
    expect(fadeByDistance(0, 250, 500)).toBe(0);
    expect(fadeByDistance(250, 250, 500)).toBe(0);
    expect(fadeByDistance(375, 250, 500)).toBeCloseTo(0.5, 6);
    expect(fadeByDistance(500, 250, 500)).toBe(1);
    expect(fadeByDistance(5000, 250, 500)).toBe(1);
    let prev = -1;
    for (let d = 0; d <= 600; d += 10) {
      const f = fadeByDistance(d, 250, 500);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it('sizes a label to a constant pixel height, independent of distance', () => {
    const cam = new THREE.PerspectiveCamera(62, 1280 / 800, 0.5, 60000);
    const heightPx = 14;
    const sy = labelScaleForPixels(heightPx, cam.fov, 800);
    // Project the top and bottom of a sizeAttenuation:false sprite at two
    // distances the way Three's sprite shader does (scale * viewDepth).
    for (const dist of [120, 900, 12000]) {
      const halfView = (sy * dist) / 2;
      const top = new THREE.Vector3(0, halfView, -dist).applyMatrix4(cam.projectionMatrix);
      const bottom = new THREE.Vector3(0, -halfView, -dist).applyMatrix4(cam.projectionMatrix);
      const px = ((top.y - bottom.y) / 2) * 800;
      expect(px).toBeCloseTo(heightPx, 6);
    }
  });
});

describe('Landmarks markers', () => {
  const at = { lat: tile.meta.center.lat, lon: tile.meta.center.lon };

  it('drops the pole: one small dot per landmark, depth-tested', () => {
    const lm = new Landmarks(tile.meta);
    lm.place([{ id: 'x', ...at }], terrain);
    const meshes: THREE.Mesh[] = [];
    lm.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    expect(meshes).toHaveLength(1);
    const mesh = meshes[0]!;
    mesh.geometry.computeBoundingSphere();
    expect(mesh.geometry.boundingSphere!.radius).toBeCloseTo(
      DEFAULT_CONFIG.landmarks.markerRadiusM,
      6,
    );
    expect((mesh.material as THREE.Material).depthTest).toBe(true);
  });

  it('fades the dot out as the camera arrives', () => {
    const lm = new Landmarks(tile.meta);
    const [p] = lm.place([{ id: 'x', ...at }], terrain);
    const cam = new THREE.PerspectiveCamera(62, 1.6, 0.5, 60000);
    const [near, far] = DEFAULT_CONFIG.landmarks.markerFadeM;

    cam.position.copy(p!.position).add(new THREE.Vector3(0, 0, far * 3));
    lm.update(cam, 800);
    expect(lm.opacities()[0]!.dot).toBeCloseTo(DEFAULT_CONFIG.landmarks.markerOpacity, 6);

    cam.position.copy(p!.position).add(new THREE.Vector3(0, 0, near * 0.5));
    lm.update(cam, 800);
    expect(lm.opacities()[0]!.dot).toBe(0);
  });

  it('setVisible hides the group but keeps the placed list for sonar', () => {
    const lm = new Landmarks(tile.meta);
    lm.place([{ id: 'x', ...at }], terrain);
    lm.setVisible(false);
    expect(lm.group.visible).toBe(false);
    expect(lm.visible).toBe(false);
    expect(lm.placed).toHaveLength(1);
    lm.setVisible(true);
    expect(lm.group.visible).toBe(true);
  });
});
