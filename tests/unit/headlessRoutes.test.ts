// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { defaultSettings } from '../../src/core/Save.js';
import { EventBus } from '../../src/core/EventBus.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Mission, parseMission, scanObjectiveFrom } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner, resolveScanRadius } from '../../src/game/Scanner.js';
import {
  composedMissionSpawn,
  missionApproachScanRadius,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { depthCue } from '../../src/ui/ScanOverlay.js';
import { SeabedWarningLatch } from '../../src/ui/HUD.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const dt = 1 / 60;
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

// No rendering, wall clock, teleports between legs, random input or route planner.
// Low uses the shipped collision triangles, including authored terrain carves.
// Report remains available after a failure for content authors and the Hunga delegate.
for (const site of json('data/landmarks/index.json').landmarks as string[]) {
  it(`${site}: plain and late players complete every routed find within 90 simulated seconds`, async () => {
    const base = makeConfig();
    const effective = resolveEffective(defaultSettings(base), 'arcade', null, base);
    const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      base.terrain,
      'low',
    );
    const props = new Props(meta, terrain, base.props, 'low');
    const rows: Record<string, unknown>[] = [];
    try {
      const content = json(`data/landmarks/${site}/props.json`);
      content.props = content.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      await props.placeAll(content, site);
      for (const policy of ['plain', 'late']) {
        const bus = new EventBus();
        const def = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
        const mission = new Mission({ def, bus });
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          base.scan,
          site,
        );
        const primaries = def.objectives
          .filter((o) => o.primary)
          .map((o) => pois.find((p) => p.id === o.poi)!);
        for (const p of pois)
          p.radius = resolveScanRadius(
            (primaries.includes(p) ? missionApproachScanRadius(site, p.radius) : p.radius) *
              effective.sensor.scanRadiusMultiplier,
            effective.scan,
          );
        mission.resolve(pois.map((p) => p.id));
        mission.setContacts(pois, () => false);
        mission.start(site);
        const scanner = new Scanner(effective.scan, bus);
        scanner.setTargets(pois);
        const sub = new Submarine(effective.submarine, terrain);
        sub.setHullClass(def.hull_class!);
        sub.setSimSpeed(1);
        const pose = composedMissionSpawn(
          site,
          primaries,
          meta,
          terrain,
          props,
          spawnSettings(base),
          base.submarine.hullClasses[def.hull_class!].ratedDepth,
          base.camera,
        )!;
        expect(pose).not.toBeNull();
        sub.reset(pose.x, pose.y, pose.z, pose.yaw);
        const latch = new SeabedWarningLatch({
          ...base.submarine,
          contactAltitudeM: base.submarine.hullRadius + base.submarine.seabedClearance,
        });
        // Select once per leg, as a player committing to the indicated marker would.
        for (let leg = 0; leg < pois.length; leg++) {
          const objective = scanObjectiveFrom(
            mission.objectives,
            () => sub.position,
            () => pois,
          );
          if (!objective) break;
          const target = pois.find((p) => p.id === objective.poiId)!;
          scanner.setObjective(target.id);
          let scannable: number | null = null;
          let seconds = 0,
            minClearance = Infinity,
            warningSeconds = 0;
          let verticalWindow: number[] = [],
            slowestVertical: number | null = null;
          let lastCommand = 0,
            scanStarted = false;
          for (let tick = 0; tick < 90 / dt; tick++) {
            seconds = (tick + 1) * dt;
            scanner.update(0, sub.position, sub.getForward(), scanStarted);
            const view = scanner.view;
            const distance = sub.position.distanceTo(target.position);
            if (view.candidateId === target.id && scannable === null) scannable = tick * dt;
            const altitude = sub.position.y - terrain.sampleHeight(sub.position.x, sub.position.z);
            const near =
              view.phase !== 'idle' ||
              (view.objectiveId !== null && Math.abs(view.objectiveVertDeg) > 5) ||
              (view.nearestInRange &&
                !view.nearestScanned &&
                altitude > base.submarine.hullRadius + base.submarine.seabedClearance + 1);
            const warning = latch.update(altitude, sub.velocity.y, near, dt);
            warningSeconds += warning ? dt : 0;
            minClearance = Math.min(minClearance, altitude - base.submarine.hullRadius);
            const cue = depthCue(view.objectiveDistance, view.objectiveVertDeg);
            const ballast = warning
              ? 1
              : distance <= view.objectiveRadius && !view.objectiveInRange
                ? -1
                : cue
                  ? Math.sign(target.position.y - sub.position.y)
                  : 0;
            // Late players stop at a hull-sized marker standoff; a seabed marker itself
            // cannot be occupied by a submarine. Both policies stop thrust while scanning.
            scanStarted ||=
              view.candidateId === target.id &&
              (policy === 'plain' ||
                Math.hypot(
                  target.position.x - sub.position.x,
                  target.position.z - sub.position.z,
                ) <= 20);
            const delta = target.position.clone().sub(sub.position);
            const error = wrap(Math.atan2(delta.x, -delta.z) - sub.yaw);
            sub.setSurveyDistance(scanner.nearestUnscannedFixedDistance(sub.position));
            sub.step(
              {
                throttle: scanStarted ? 0 : 1,
                yaw: clamp(error * 2),
                pitch: 0,
                ballast,
                lookDx: 0,
                lookDy: 0,
                toggleCamera: false,
                toggleSonar: false,
                toggleLights: false,
                scan: scanStarted,
                cycleSimSpeed: false,
                togglePhotoMode: false,
              },
              dt,
            );
            if (ballast !== lastCommand) verticalWindow = [];
            lastCommand = ballast;
            if (ballast) {
              verticalWindow.push(sub.velocity.y * ballast);
              if (verticalWindow.length > 120) verticalWindow.shift();
              if (verticalWindow.length === 120) {
                const speed = verticalWindow.reduce((a, b) => a + b, 0) / 120;
                slowestVertical = Math.min(slowestVertical ?? Infinity, speed);
              }
            }
            scanner.update(dt, sub.position, sub.getForward(), scanStarted);
            if (scanner.isScanned(site, target.id)) break;
          }
          const completed = scanner.isScanned(site, target.id);
          rows.push({
            site,
            policy,
            leg: leg + 1,
            target: target.id,
            seconds,
            scannable,
            minClearance,
            warningSeconds,
            slowestVertical,
            completed,
            distance: sub.position.distanceTo(target.position),
          });
          expect
            .soft(completed, `${policy} ${target.id}: ${JSON.stringify(rows.at(-1))}`)
            .toBe(true);
          if (!completed) break; // Later legs cannot be measured from an invented start.
        }
      }
    } finally {
      mkdirSync('.cache/headless-routes', { recursive: true });
      writeFileSync(`.cache/headless-routes/${site}.json`, JSON.stringify(rows, null, 2) + '\n');
      terrain.dispose();
    }
  });
}
