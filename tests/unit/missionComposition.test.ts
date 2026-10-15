// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { composedMissionSpawn, MISSION_APPROACH_M, spawnSettings } from '../../src/game/Spawn.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';
import { missionApproachScanRadius } from '../../src/game/Spawn.js';
import { Scanner } from '../../src/game/Scanner.js';
import { EventBus } from '../../src/core/EventBus.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';

const sites: string[] = readdirSync('data/landmarks').filter(
  (site: string) => !site.startsWith('_') && !site.endsWith('.json'),
);
it('covers all 13 authored mission sites', () => {
  expect(sites).toHaveLength(13);
});

it.each(sites)(
  '%s: a primary can be scanned at its reach and minimum depth with a safe hull',
  async (site) => {
    const config = makeConfig();
    const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
    const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'low',
    );
    const props = new Props(meta, terrain, config.props, 'low');
    try {
      const content = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
      content.props = content.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      await props.placeAll(content, site);
      const mission = parseMission(
        JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8')),
        site,
      )!;
      const pois = placePois(
        parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8'))),
        meta,
        terrain,
        config.scan,
        site,
      );
      const primary = pois.find((p) => p.id === mission.objectives.find((o) => o.primary)!.poi)!;
      expect(primary).toBeDefined();
      const baseReach = missionApproachScanRadius(site, primary.radius);
      for (const radius of [baseReach, baseReach * effective.sensor.scanRadiusMultiplier]) {
        const target = { ...primary, radius };
        const sub = new Submarine(effective.submarine, terrain);
        sub.setHullClass(mission.hull_class!);
        const clearance = config.submarine.hullRadius + config.submarine.seabedClearance;
        let contact: Vector3 | null = null;
        // Search navigable water around the contact, respecting the hull, terrain,
        // procedural subject collision and the submarine's actual pitch limit.
        for (const fraction of [0.9, 0.75, 0.5, 0.25]) {
          for (let bearing = 0; bearing < 32 && !contact; bearing++) {
            const angle = (bearing * Math.PI) / 16;
            const p = primary.position
              .clone()
              .add(
                new Vector3(
                  Math.sin(angle) * radius * fraction,
                  0,
                  Math.cos(angle) * radius * fraction,
                ),
              );
            const floor = terrain.sampleHeight(p.x, p.z) + clearance;
            // Leave a metre for the boat's idle buoyancy after the real physics step.
            p.y = Math.min(
              Math.max(primary.position.y, floor + 1),
              -(primary.minDepthM ?? config.submarine.hullRadius) - 1,
            );
            if (p.y < floor || p.y < sub.getState().ratedDepth + config.submarine.hullRadius)
              continue;
            const delta = primary.position.clone().sub(p);
            if (delta.length() > radius || delta.length() < radius * 0.5) continue;
            if (
              Math.abs(Math.atan2(delta.y, Math.hypot(delta.x, delta.z))) >
              effective.submarine.maxPitch
            )
              continue;
            if (props.collide(p.clone(), config.submarine.hullRadius, new Vector3())) continue;
            contact = p;
          }
          if (contact) break;
        }
        expect(
          contact,
          `${site}: navigable water within ${radius} m, min_depth_m=${primary.minDepthM}`,
        ).not.toBeNull();
        const p = contact!;
        const delta = primary.position.clone().sub(p);
        sub.reset(p.x, p.y, p.z, Math.atan2(delta.x, -delta.z));
        sub.pitch = Math.atan2(delta.y, Math.hypot(delta.x, delta.z));
        sub.step(FROZEN_INPUT, 1 / 60);
        expect(sub.hullBreached).toBe(false);
        expect(sub.position.y).toBeGreaterThanOrEqual(terrain.sampleHeight(p.x, p.z) + clearance);
        const bus = new EventBus();
        const completed = [] as string[];
        bus.on('scan:complete', ({ poiId }) => completed.push(poiId));
        const scanner = new Scanner(effective.scan, bus);
        scanner.setTargets([target]);
        scanner.setObjective(primary.id);
        if (primary.minDepthM !== undefined) {
          const shallow = sub.position.clone().setY(-primary.minDepthM + 0.01);
          scanner.update(
            primary.scanSeconds + 1,
            shallow,
            primary.position.clone().sub(shallow).normalize(),
            true,
          );
          expect(completed).toEqual([]);
        }
        scanner.update(primary.scanSeconds + 1, sub.position, sub.getForward(), true);
        expect(completed).toEqual([primary.id]);
      }
    } finally {
      terrain.dispose();
    }
  },
);

for (const site of sites) {
  it(`Arcade ${site}: starts 150–300 m from the first primary before and after props load`, async () => {
    const config = makeConfig();
    const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'low',
    );
    const props = new Props(meta, terrain, config.props, 'low');
    const mission = parseMission(
      JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8')),
      site,
    )!;
    const pois = placePois(
      parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8'))),
      meta,
      terrain,
      config.scan,
      site,
    );
    const primaries = mission.objectives
      .filter((o) => o.primary)
      .map((o) => pois.find((p) => o.poi === p.id)!);
    const safeDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
    const check = () => {
      const pose = composedMissionSpawn(
        site,
        primaries,
        meta,
        terrain,
        props,
        spawnSettings(config),
        safeDepth,
        config.camera,
      );
      expect(pose).not.toBeNull();
      const nearest = Math.min(
        ...primaries.map(({ position: p }) => Math.hypot(p.x - pose!.x, p.z - pose!.z)),
      );
      expect(nearest).toBeLessThanOrEqual(300 + 1e-8);
      const spatialRange = Math.min(
        ...primaries.map(({ position: p }) =>
          Math.hypot(p.x - pose!.x, p.y - pose!.y, p.z - pose!.z),
        ),
      );
      expect(spatialRange).toBeCloseTo(MISSION_APPROACH_M[site], 2);
      expect(spatialRange).toBeGreaterThanOrEqual(150);
      expect(spatialRange).toBeLessThanOrEqual(300 + 1e-8);
      expect(pose!.y).toBeGreaterThanOrEqual(safeDepth + config.submarine.hullRadius);
      expect(pose!.y).toBeGreaterThanOrEqual(
        terrain.sampleHeight(pose!.x, pose!.z) +
          config.submarine.hullRadius +
          config.submarine.seabedClearance,
      );
      expect(
        props.collide(
          new Vector3(pose!.x, pose!.y, pose!.z),
          config.submarine.hullRadius,
          new Vector3(),
        ),
      ).toBe(false);
    };
    try {
      check();
      const content = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
      content.props = content.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      await props.placeAll(content, site);
      check();
    } finally {
      terrain.dispose();
    }
  });
}
