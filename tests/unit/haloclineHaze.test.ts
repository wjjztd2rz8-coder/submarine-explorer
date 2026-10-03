import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ReefPreset } from '../../src/world/presets/ReefPreset.js';
import type { PresetEnterContext } from '../../src/world/presets/types.js';

const look = { ambient: 0.1, headlightGain: 1, headlightFalloffM: 60 };

function enter(params: Record<string, unknown>, visuals: boolean) {
  const scene = new THREE.Scene();
  const preset = new ReefPreset(look);
  preset.enter({
    scene,
    terrain: { sampleHeight: () => -4 },
    props: [],
    pois: [],
    params,
    visuals,
    particleScale: 1,
    maxParticles: 1000,
    spawn: new THREE.Vector3(),
    toWorld: () => ({ x: 100, z: -50 }),
    bus: {},
  } as unknown as PresetEnterContext);
  return { scene, preset };
}

const halo = { haloclineDepthM: 90, haloclineLat: 17.3, haloclineLon: -87.5, shafts: 0 };

describe('reef halocline haze', () => {
  it('adds one merged mesh at the halocline depth', () => {
    const { scene, preset } = enter(halo, true);
    const mesh = scene.getObjectByName('haloclineHaze') as THREE.Mesh;
    expect(mesh).toBeTruthy();
    expect(preset.stats.draws).toBe(1);
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    expect(box.min.y).toBeCloseTo(-91.4, 1);
    expect(box.max.y).toBeCloseTo(-88.6, 1);
  });

  it('keeps a single cheap disc on the low tier', () => {
    const { scene } = enter(halo, false);
    const mesh = scene.getObjectByName('haloclineHaze') as THREE.Mesh;
    expect(mesh).toBeTruthy();
    expect(mesh.geometry.getIndex()!.count / 3).toBe(40);
  });

  it('is off without a depth or a position', () => {
    expect(enter({ shafts: 0 }, true).scene.getObjectByName('haloclineHaze')).toBeUndefined();
    expect(
      enter({ haloclineDepthM: 90, shafts: 0 }, true).scene.getObjectByName('haloclineHaze'),
    ).toBeUndefined();
  });
});
