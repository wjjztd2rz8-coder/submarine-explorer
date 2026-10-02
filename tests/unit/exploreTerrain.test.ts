// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { ProgressSave } from '../../src/core/Save.js';
import { Progress } from '../../src/game/Progress.js';
import { parseSecrets, placeSecrets } from '../../src/game/Secrets.js';
import { placeSamples } from '../../src/game/Samples.js';
import { Scanner } from '../../src/game/Scanner.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';
import { scanAim } from '../e2e/helpers/scanAim.js';

const config = makeConfig();
const sites = JSON.parse(readFileSync('data/landmarks/index.json', 'utf8')).landmarks as string[];

describe('curiosity placements on actual site terrain', () => {
  for (const site of sites) {
    it(`${site}: three secrets and two samples stay scannable through normal physics`, () => {
      const doc = parseSecrets(JSON.parse(readFileSync(`data/secrets/${site}.json`, 'utf8')));
      expect(doc.secrets).toHaveLength(3);
      expect(doc.samples).toHaveLength(2);
      const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, 'low');
      try {
        const ground = (x: number, z: number): number => terrain.sampleHeight(x, z);
        const targets = [
          ...placeSecrets(doc, site, meta, ground),
          ...placeSamples(doc.samples, site, meta, ground),
        ];
        const scanner = new Scanner(config.scan, new EventBus());
        scanner.setSupplementalTargets(targets);
        const sub = new Submarine(config.submarine, terrain);
        sub.setHullClass('C');
        for (const t of targets) {
          expect(t.position.y).toBeLessThan(-10);
          expect(Math.abs(t.position.x)).toBeLessThan(terrain.widthM / 2);
          expect(Math.abs(t.position.z)).toBeLessThan(terrain.depthM / 2);
          expect(t.position.y - ground(t.position.x, t.position.z)).toBeCloseTo(
            t.id.startsWith('secret:') ? 2 : 0.6,
          );
          const p = {
            x: t.position.x,
            y: Math.max(t.position.y + 10, ground(t.position.x, t.position.z + 10) + 13),
            z: t.position.z + 10,
          };
          // Match the e2e inspection view and prove the target is inside the
          // frame with a clear sightline past the central hull, on real terrain.
          const view = new CameraRig(config.camera, 1280 / 720, terrain);
          view.freeLook = true;
          view.lookAzimuth = 1.35;
          view.lookElevation = 0.55;
          view.chaseRadius = 52;
          const position = new THREE.Vector3(p.x, p.y, p.z);
          view.snap(position, 0, 0);
          view.camera.updateMatrixWorld();
          const projected = t.position.clone().project(view.camera);
          expect(Math.abs(projected.x), t.id).toBeLessThan(0.85);
          expect(Math.abs(projected.y), t.id).toBeLessThan(0.85);
          expect(projected.z, t.id).toBeGreaterThan(-1);
          expect(projected.z, t.id).toBeLessThan(1);
          const sightline = new THREE.Ray(
            view.camera.position,
            t.position.clone().sub(view.camera.position).normalize(),
          );
          expect(sightline.distanceToPoint(position), t.id).toBeGreaterThan(7);
          const aim = scanAim(p, t.position, config.submarine.maxPitch);
          sub.reset(p.x, p.y, p.z, aim.yaw);
          sub.pitch = aim.pitch;
          scanner.cancel();
          scanner.update(0, sub.position, sub.getForward(), false);
          expect(scanner.view.candidateId, t.id).toBe(t.id);
          const steps = Math.ceil((t.scanSeconds + 0.1) * 60);
          for (let step = 0; step < steps && !scanner.isScanned(site, t.id); step++) {
            sub.step(FROZEN_INPUT, 1 / 60);
            scanner.update(1 / 60, sub.position, sub.getForward(), true);
          }
          expect(scanner.isScanned(site, t.id), `${site}/${t.id}`).toBe(true);
        }
      } finally {
        terrain.dispose();
      }
    });
  }
});

it('curiosity rewards persist idempotently and stay finite', () => {
  const progress = new Progress(new ProgressSave(null));
  expect(progress.award('secret', 'lost-city/arch')).toBe(15);
  expect(progress.award('sample', 'lost-city/sediment')).toBe(10);
  expect(progress.award('event', 'lost-city/plume')).toBe(5);
  expect(progress.points).toBe(30);
  progress.beginDive();
  expect(progress.award('secret', 'lost-city/arch')).toBe(0);
  expect(progress.award('sample', 'lost-city/sediment')).toBe(0);
  expect(progress.award('event', 'lost-city/plume')).toBe(0);
  expect(progress.points).toBe(30);
  expect(progress.divePoints).toBe(0);
});
