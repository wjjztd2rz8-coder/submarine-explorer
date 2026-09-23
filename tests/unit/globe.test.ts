import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/core/Config.js';
import type { FetchJson } from '../../src/game/ContentPath.js';
import {
  buildSites,
  facesCamera,
  latLonToUnit,
  loadGlobeCatalog,
  OrbitState,
  parseCatalogue,
  pinBadge,
  resolvePinState,
  spreadOverlaps,
  unitToLatLon,
  wrapDeg,
  type CatalogueLandmark,
} from '../../src/ui/GlobeModel.js';
import { tileUrl } from '../../src/ui/MissionSelect.js';

const close = (a: number, b: number, eps = 1e-9): void => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('lat/lon -> sphere', () => {
  it('matches SphereGeometry texture mapping: lon 0 -> +X, 90E -> -Z, N pole -> +Y', () => {
    const a = latLonToUnit(0, 0);
    close(a.x, 1);
    close(a.y, 0);
    close(a.z, 0);
    const e = latLonToUnit(0, 90);
    close(e.x, 0);
    close(e.z, -1);
    const n = latLonToUnit(90, 12);
    close(n.y, 1);
    const w = latLonToUnit(0, -180);
    close(w.x, -1);
  });

  it('agrees with three.js SphereGeometry vertex for the same uv', () => {
    // SphereGeometry: x = -cos(u*2pi) sin(v*pi), y = cos(v*pi), z = sin(u*2pi) sin(v*pi),
    // with u = (lon + 180) / 360 and v = (90 - lat) / 180.
    for (const [lat, lon] of [
      [41.73, -49.95],
      [-11.35, 142.2],
      [30.12, -42.12],
    ]) {
      const u = (lon + 180) / 360;
      const v = (90 - lat) / 180;
      const p = latLonToUnit(lat, lon);
      close(p.x, -Math.cos(u * 2 * Math.PI) * Math.sin(v * Math.PI), 1e-12);
      close(p.y, Math.cos(v * Math.PI), 1e-12);
      close(p.z, Math.sin(u * 2 * Math.PI) * Math.sin(v * Math.PI), 1e-12);
    }
  });

  it('round-trips and is unit length', () => {
    for (const [lat, lon] of [
      [41.73, -49.95],
      [-60, 179],
      [10, -3],
    ]) {
      const p = latLonToUnit(lat, lon);
      close(Math.hypot(p.x, p.y, p.z), 1);
      const back = unitToLatLon(p);
      close(back.lat, lat, 1e-9);
      close(back.lon, lon, 1e-9);
    }
  });

  it('horizon test and angle wrapping', () => {
    const cam = { x: 3, y: 0, z: 0 };
    expect(facesCamera(latLonToUnit(0, 0), cam)).toBe(true);
    expect(facesCamera(latLonToUnit(0, 180), cam)).toBe(false);
    expect(facesCamera(latLonToUnit(0, 80), cam)).toBe(false); // past the horizon from 3 radii
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-180)).toBe(180);
  });
});

const lm = (id: string, lat = 0, lon = 0): CatalogueLandmark => ({
  id,
  name: id,
  type: 'vent',
  lat,
  lon,
  depthM: 1000,
  region: '',
  summary: '',
});

describe('pin state resolution', () => {
  it('mission beats tile beats catalogue', () => {
    const missions = new Set(['titanic']);
    const tiles = new Set(['titanic', 'lost-city']);
    expect(resolvePinState('titanic', missions, tiles)).toBe('mission');
    expect(resolvePinState('lost-city', missions, tiles)).toBe('tile');
    expect(resolvePinState('mariana', missions, tiles)).toBe('catalogue');
  });

  it('buildSites: index-listed without a loaded mission is a pending free dive; sorted mission first', () => {
    const sites = buildSites(
      [lm('c', 0, -10), lm('lost-city', 30, -42), lm('titanic', 41, -50)],
      ['titanic', 'lost-city'],
      ['titanic', 'lost-city'],
      [{ id: 'titanic', title: 'Titanic dive', summary: '', depthM: 3800, tile: 'titanic' }],
    );
    expect(sites.map((s) => [s.id, s.state])).toEqual([
      ['titanic', 'mission'],
      ['lost-city', 'tile'],
      ['c', 'catalogue'],
    ]);
    expect(sites[0].missionTitle).toBe('Titanic dive');
    expect(sites[1].missionPending).toBe(true);
    expect(pinBadge(sites[1])).toMatch(/MISSION COMING/);
    expect(sites[2].missionPending).toBe(false);
    expect(pinBadge(sites[2])).toBe('CATALOGUE ONLY');
  });

  it('parseCatalogue drops malformed rows and normalises depth', () => {
    const out = parseCatalogue({
      landmarks: [
        { id: 'a', lat: 1, lon: 2, depth_m: -500, name: 'A', type: 'wreck' },
        { id: 'a', lat: 3, lon: 4 },
        { id: 'b', lat: 95, lon: 0 },
        { lat: 1, lon: 1 },
        { id: 'c', latitude: 5, longitude: 6 },
      ],
    });
    expect(out.map((l) => l.id)).toEqual(['a', 'c']);
    expect(out[0].depthM).toBe(500);
    expect(out[1].type).toBe('other');
    expect(parseCatalogue('<html>')).toEqual([]);
  });

  it('loadGlobeCatalog survives HTML fallbacks for missing mission.json files and never warns', async () => {
    const files: Record<string, string> = {
      '/data/landmarks.json': JSON.stringify({
        landmarks: [
          { id: 'titanic', lat: 41.7, lon: -49.9, name: 'RMS Titanic' },
          { id: 'lost-city', lat: 30.1, lon: -42.1, name: 'Lost City' },
          { id: 'x', lat: 0, lon: 0 },
        ],
      }),
      '/data/landmarks/index.json': JSON.stringify({
        version: 1,
        landmarks: ['titanic', 'lost-city'],
      }),
      '/data/landmarks/titanic/mission.json': JSON.stringify({
        title: 'Titanic dive',
        spawn: { lat: 41.7, lon: -49.9 },
        objectives: [{ id: 'o', poi: 'bow' }],
      }),
      '/data/landmarks/lost-city/mission.json': '{ "title": broken',
    };
    const fetch: FetchJson = async (u) => ({
      ok: true,
      text: async () => files[u] ?? '<!doctype html>',
    });
    const warn = console.warn;
    const warned: unknown[] = [];
    console.warn = (...a: unknown[]) => warned.push(a);
    try {
      const c = await loadGlobeCatalog(['titanic', 'lost-city'], fetch);
      expect(c.sites.map((s) => s.state)).toEqual(['mission', 'tile', 'catalogue']);
      expect(c.pending).toEqual([{ id: 'lost-city', name: 'Lost City', tileAvailable: true }]);
    } finally {
      console.warn = warn;
    }
    expect(warned).toEqual([]);
  });
});

describe('overlap spreading', () => {
  it('leaves separated pins and hidden pins alone', () => {
    const out = spreadOverlaps(
      [
        { x: 0, y: 0, visible: true },
        { x: 100, y: 0, visible: true },
        { x: 1, y: 1, visible: false },
      ],
      16,
    );
    expect(out).toEqual([
      { x: 0, y: 0, group: 1 },
      { x: 100, y: 0, group: 1 },
      { x: 1, y: 1, group: 1 },
    ]);
  });

  it('fans a cluster out so every pair is at least minPx apart, around the centroid', () => {
    const pins = [
      { x: 200, y: 200, visible: true },
      { x: 203, y: 201, visible: true },
      { x: 205, y: 198, visible: true },
      { x: 212, y: 200, visible: true }, // chained via the third
      { x: 400, y: 400, visible: true },
    ];
    const out = spreadOverlaps(pins, 16);
    const cluster = out.slice(0, 4);
    for (const p of cluster) expect(p.group).toBe(4);
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const d = Math.hypot(cluster[i].x - cluster[j].x, cluster[i].y - cluster[j].y);
        expect(d).toBeGreaterThanOrEqual(16 - 1e-9);
      }
    }
    const cx = cluster.reduce((s, p) => s + p.x, 0) / 4;
    const cy = cluster.reduce((s, p) => s + p.y, 0) / 4;
    close(cx, (200 + 203 + 205 + 212) / 4, 1e-9);
    close(cy, (200 + 201 + 198 + 200) / 4, 1e-9);
    expect(out[4]).toEqual({ x: 400, y: 400, group: 1 });
  });

  it('two identical points split to exactly minPx', () => {
    const out = spreadOverlaps(
      [
        { x: 10, y: 10, visible: true },
        { x: 10, y: 10, visible: true },
      ],
      16,
    );
    close(Math.hypot(out[0].x - out[1].x, out[0].y - out[1].y), 16, 1e-9);
  });
});

describe('orbit', () => {
  const t = DEFAULT_CONFIG.globe;

  it('drag right moves the camera west; release spins on with inertia then settles', () => {
    const o = new OrbitState(t);
    o.lon = 0;
    o.lat = 0;
    o.beginDrag();
    o.drag(50, 0, 1 / 60);
    const afterDrag = o.lon;
    expect(afterDrag).toBeLessThan(0);
    o.endDrag();
    o.update(1 / 60);
    expect(o.lon).toBeLessThan(afterDrag); // keeps going
    for (let i = 0; i < 600; i++) o.update(1 / 60);
    const settled = o.lon;
    o.update(1 / 60);
    // After the spin decays, only the (slow) idle auto-rotate moves it.
    expect(Math.abs(wrapDeg(o.lon - settled))).toBeLessThanOrEqual(t.autoRotateDegPerS / 60 + 1e-9);
  });

  it('auto-rotates only after the idle delay', () => {
    const o = new OrbitState(t);
    const lon0 = o.lon;
    o.update(t.idleBeforeAutoRotateS * 0.5);
    expect(o.lon).toBe(lon0);
    o.update(t.idleBeforeAutoRotateS);
    expect(o.autoRotating).toBe(true);
    o.update(1);
    expect(o.lon).not.toBe(lon0);
  });

  it('zoom clamps, latitude clamps, and faceLatLon eases to the pin by the shortest way', () => {
    const o = new OrbitState(t);
    o.zoomBy(1e6);
    expect(o.distance).toBe(t.maxDistance);
    o.zoomBy(1e-6);
    expect(o.distance).toBe(t.minDistance);
    o.beginDrag();
    o.drag(0, 1e6, 1);
    expect(o.lat).toBe(t.maxLatDeg);
    o.endDrag();
    o.lon = 170;
    o.faceLatLon(10, -170);
    o.update(1 / 60);
    expect(o.lon === 180 || o.lon > 170 || o.lon < -170).toBe(true); // crossed the dateline, not the long way
    // ~3 s: long enough to converge, shorter than the idle delay before auto-rotate.
    for (let i = 0; i < 180; i++) o.update(1 / 60);
    close(o.lat, 10, 0.05);
    close(wrapDeg(o.lon + 170), 0, 0.05);
  });

  it('camera sits over its lat/lon at `distance` radii', () => {
    const o = new OrbitState(t);
    o.lat = 41.7;
    o.lon = -49.9;
    const c = o.cameraPosition();
    close(Math.hypot(c.x, c.y, c.z), o.distance, 1e-9);
    const ll = unitToLatLon(c);
    close(ll.lat, 41.7, 1e-9);
    close(ll.lon, -49.9, 1e-9);
  });
});

describe('tileUrl', () => {
  it('drops ?globe= so choosing from the globe does not reopen it', () => {
    const u = new URL(tileUrl('http://x/?tile=titanic&globe=1&mission=m', 'lost-city'));
    expect(u.searchParams.get('globe')).toBeNull();
    expect(u.searchParams.get('mission')).toBeNull();
    expect(u.searchParams.get('tile')).toBe('lost-city');
  });
});
