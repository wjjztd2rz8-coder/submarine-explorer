// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Raycaster, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig, PHOTO_ORBIT_MAX_M, PHOTO_ORBIT_MIN_M } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const config = makeConfig();
const meta = read('data/tiles/lost-city/meta.json') as TileMeta;
const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
const terrain = new Terrain(
  { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
  config.terrain,
  'low',
);
const props = new Props(meta, terrain, config.props, 'medium');

beforeAll(async () => {
  await props.placeAll(read('data/landmarks/lost-city/props.json'), 'lost-city');
});
afterAll(() => terrain.dispose());

function opening() {
  return composedFreeDiveSpawn(
    'lost-city',
    meta,
    terrain,
    props,
    spawnSettings(config),
    -3000,
    config.camera,
  )!;
}

describe('Lost City camera geometry', () => {
  it.each(['A', 'B', 'C'])(
    'keeps the tower axis clear of hull %s and faces the hero at both requested sizes',
    (hullClass) => {
      const pose = opening();
      const pos = new Vector3(pose.x, pose.y, pose.z);
      const rig = new CameraRig(config.camera, 16 / 9, terrain);
      rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX);
      rig.snap(pos, pose.yaw, 0);
      const hero = props.placed.find((p) => p.def.id === 'poseidon-tower')!;
      const toHero = hero.root
        .localToWorld(hero.localBounds.getCenter(new Vector3()))
        .sub(pos)
        .setY(0)
        .normalize();
      expect(new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)).dot(toHero)).toBeGreaterThan(
        0.98,
      );
      expect(rig.camera.position.distanceTo(pos)).toBeCloseTo(50, 6);
      const sub = new SubMesh({ length: 26, hullClass, tier: 'low' });
      sub.setPose(pos, pose.yaw, 0, 0);
      sub.group.updateMatrixWorld(true);
      try {
        for (const aspect of [1600 / 900, 844 / 390, 390 / 844]) {
          rig.setAspect(aspect);
          rig.camera.updateMatrixWorld(true);
          for (let height = 0; height <= 60; height += 5) {
            const point = hero.root.localToWorld(new Vector3(0, height, 0));
            const screen = point.clone().project(rig.camera);
            expect(Math.abs(screen.x)).toBeLessThan(0.9);
            expect(Math.abs(screen.y)).toBeLessThan(0.9);
            expect(screen.z).toBeGreaterThan(-1);
            expect(screen.z).toBeLessThan(1);
            const ray = new Raycaster(
              rig.camera.position,
              point.clone().sub(rig.camera.position).normalize(),
            );
            const boatHit = ray.intersectObject(sub.vehicle.root, true)[0];
            const towerHit = ray.intersectObject(hero.root, true)[0];
            if (boatHit && towerHit) expect(boatHit.distance).toBeGreaterThan(towerHit.distance);
          }
        }
      } finally {
        sub.dispose();
      }
    },
  );

  it('clears the actual slope while turning, zooming, free looking and framing photos', () => {
    const pose = opening();
    const pos = new Vector3(pose.x, pose.y, pose.z);
    const rig = new CameraRig(config.camera, 844 / 390, terrain);
    rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX);
    const check = () => {
      const eye = rig.camera.position;
      expect(eye.y).toBeGreaterThanOrEqual(
        terrain.sampleHeight(eye.x, eye.z) + config.camera.terrainClearance - 1e-8,
      );
      expect(eye.y).toBeLessThanOrEqual(-config.camera.surfaceClearance);
      // The near plane must clear the slope too, not only the camera centre.
      rig.camera.updateMatrixWorld(true);
      for (const x of [-1, 1])
        for (const y of [-1, 1]) {
          const corner = new Vector3(x, y, -1).unproject(rig.camera);
          expect(corner.y).toBeGreaterThan(terrain.sampleHeight(corner.x, corner.z));
        }
    };
    for (const radius of [35, 50, 180])
      for (let turn = 0; turn < 360; turn += 5) {
        rig.chaseRadius = radius;
        rig.snap(pos, pose.yaw + (turn * Math.PI) / 180, 0);
        check();
      }
    rig.orbit(0.2, -0.5);
    for (let i = 0; i < 72; i++) {
      rig.orbit(Math.PI / 36, 0);
      rig.update(pos, pose.yaw, 0, 1 / 60);
      check();
    }
    rig.enterPhotoMode(pos);
    for (const radius of [PHOTO_ORBIT_MIN_M, 50, PHOTO_ORBIT_MAX_M]) {
      rig.orbitRadius = radius;
      for (const elevation of [-1.4, -0.5, 0.35, 1.4]) {
        rig.orbitElevation = elevation;
        for (let i = 0; i < 72; i++) {
          rig.orbit(Math.PI / 36, 0);
          rig.update(pos, pose.yaw, 0, 1 / 60);
          check();
        }
      }
    }
  });
});

describe('Lost City chase reset and photo return', () => {
  it('restores the opening distance after wheel zoom, free look and view toggles', () => {
    const rig = new CameraRig(config.camera, 16 / 9);
    rig.setChaseRadiusDefault(50, config.camera.lostCityArcadeOpening.chaseOffsetXM);
    const pos = new Vector3(0, -750, 0);
    rig.snap(pos, 0.5, 0);
    const openingEye = rig.camera.position.clone();
    rig.orbit(0, 0, -100);
    expect(rig.chaseRadius).toBe(35);
    expect(rig.freeLook).toBe(false);
    rig.orbit(0, 0, 100);
    expect(rig.chaseRadius).toBe(180);
    rig.orbit(0.3, 0.1);
    expect(rig.freeLook).toBe(true);
    rig.resetView();
    rig.update(pos, 0.5, 0, 1 / 60);
    expect(rig.camera.position.distanceTo(openingEye)).toBeLessThan(1e-6);
    expect(rig.chaseRadius).toBe(50);
    expect(rig.freeLook).toBe(false);
    rig.toggleMode();
    expect(rig.mode).toBe('first-person');
    rig.toggleMode();
    expect(rig.mode).toBe('chase');
    expect(rig.chaseRadius).toBe(50);
    rig.setChaseRadiusDefault(); // Surface / Realistic / missing opening clears the override.
    rig.chaseRadius = 35;
    rig.resetView();
    expect(rig.chaseRadius).toBeCloseTo(Math.hypot(38, 90), 6);
    rig.update(pos, 0.5, 0, 1 / 60);
    const legacy = new CameraRig(config.camera, 16 / 9);
    legacy.snap(pos, 0.5, 0);
    expect(rig.camera.position.distanceTo(legacy.camera.position)).toBeLessThan(1e-6);
  });

  it('photo zoom does not change chase zoom or its reset default and restores the previous view', () => {
    for (const mode of ['chase', 'first-person'] as const) {
      const pose = opening();
      const pos = new Vector3(pose.x, pose.y, pose.z);
      const rig = new CameraRig(config.camera, 16 / 9, terrain);
      rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX);
      rig.setMode(mode);
      rig.snap(pos, pose.yaw, 0);
      const eye = rig.camera.position.clone();
      const aim = rig.camera.quaternion.clone();
      rig.enterPhotoMode(pos);
      rig.update(pos, pose.yaw, 0, 1 / 60);
      if (mode === 'chase') expect(rig.camera.position.distanceTo(eye)).toBeLessThan(1e-6);
      rig.orbit(0.2, -0.5, 100);
      expect(rig.orbitRadius).toBe(PHOTO_ORBIT_MAX_M);
      rig.orbit(0, 0, -100);
      expect(rig.orbitRadius).toBe(PHOTO_ORBIT_MIN_M);
      expect(rig.chaseRadius).toBe(50);
      expect(rig.exitPhotoMode()).toBe(mode);
      rig.update(pos, pose.yaw, 0, 1 / 60);
      expect(rig.camera.position.distanceTo(eye)).toBeLessThan(1e-6);
      expect(rig.camera.quaternion.angleTo(aim)).toBeLessThan(1e-6);
      rig.resetView();
      expect(rig.chaseRadius).toBe(50);
    }
  });
});
