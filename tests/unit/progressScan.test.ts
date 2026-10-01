// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { DiscoveryStore } from '../../src/game/DiscoveryStore.js';
import { parsePois, placePois, spawnPoseForPoi } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';
import { scanAim } from '../e2e/helpers/scanAim.js';

const site = 'blake-plateau-corals';
const config = makeConfig();
Object.assign(config.submarine, config.speedProfiles.fast, config.descentProfiles.fast);
const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
const definitions = parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8')));

function setup() {
  const terrain = new Terrain({ meta, heights }, config.terrain, 'low');
  const targets = placePois(definitions, meta, terrain, config.scan, site);
  for (const target of targets) target.radius *= config.sensorPresets.extended.scanRadiusMultiplier;
  const store = new DiscoveryStore(null);
  const scanner = new Scanner(config.scan, new EventBus(), store);
  scanner.setTargets(targets);
  const sub = new Submarine(config.submarine, terrain);
  sub.setHullClass('A');
  return { terrain, targets, store, scanner, sub };
}

describe('progress e2e scan positioning on actual Blake Plateau terrain', () => {
  it('reproduces the flat-heading failure: a slope contact needs pitch', () => {
    const { terrain, targets, scanner, sub } = setup();
    try {
      const target = targets[0];
      const p = spawnPoseForPoi(
        target,
        terrain,
        config.scan,
        config.submarine.hullRadius + config.submarine.seabedClearance,
      );
      sub.reset(p.x, p.y, p.z, p.yaw);
      scanner.update(0, sub.position, sub.getForward(), false);
      expect(scanner.view.candidateId).not.toBe(target.id);
      expect(scanner.view.nearestFacing).toBe(false);
      const aim = scanAim(p, target.position, config.submarine.maxPitch);
      sub.yaw = aim.yaw;
      sub.pitch = aim.pitch;
      scanner.update(0, sub.position, sub.getForward(), false);
      expect(scanner.view.candidateId).toBe(target.id);
    } finally {
      terrain.dispose();
    }
  });
  it('scans each intended contact through normal physics without changing the scan cone or rewards', () => {
    const { terrain, targets, scanner, sub, store } = setup();
    try {
      for (const target of targets) {
        const p = spawnPoseForPoi(
          target,
          terrain,
          config.scan,
          config.submarine.hullRadius + config.submarine.seabedClearance,
        );
        const aim = scanAim(p, target.position, config.submarine.maxPitch);
        sub.reset(p.x, p.y, p.z, aim.yaw);
        sub.pitch = aim.pitch;
        scanner.cancel();
        scanner.update(0, sub.position, sub.getForward(), false);
        expect(scanner.view.candidateId, target.id).toBe(target.id);
        const steps = Math.ceil((target.scanSeconds + 0.1) * 60);
        for (let step = 0; step < steps && !store.isDiscovered(site, target.id); step++) {
          sub.step(FROZEN_INPUT, 1 / 60);
          scanner.update(1 / 60, sub.position, sub.getForward(), true);
        }
        expect(store.isDiscovered(site, target.id), target.id).toBe(true);
        expect(scanner.view.lastCompleteId).toBe(target.id);
      }
      expect(store.keys()).toHaveLength(4);
      expect(scanner.view.completed).toBe(4);
    } finally {
      terrain.dispose();
    }
  });
  it('respects pitch limits rather than relaxing the scanner facing requirement', () => {
    expect(scanAim({ x: 0, y: 0, z: 0 }, { x: 0, y: -100, z: -1 }, Math.PI / 4).pitch).toBe(
      -Math.PI / 4,
    );
  });
});
