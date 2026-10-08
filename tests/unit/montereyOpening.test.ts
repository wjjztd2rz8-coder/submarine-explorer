// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeConfig, MONTEREY_OPENING, type GraphicsTier } from '../../src/core/Config.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { EventBus } from '../../src/core/EventBus.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import { LifeSim } from '../../src/world/life/LifeSim.js';
import { LIFE_TIERS } from '../../src/world/life/types.js';
import { parseLifeDoc } from '../../src/world/life/tables.js';
import { populateMontereyOpening } from '../../src/world/life/MontereyOpening.js';
import { Headlights } from '../../src/render/Headlights.js';
import { atmosphereTier } from '../../src/render/Atmosphere.js';
import type { SubInfo } from '../../src/world/life/agent.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const site = 'monterey-canyon';

describe('Monterey opening habitat', () => {
  for (const tier of ['low', 'medium', 'high', 'ultra'] as GraphicsTier[]) {
    it(`${tier}: shows fish and a floor field immediately, retaining the first scan`, async () => {
      const config = makeConfig();
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      try {
        await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
        const pose = composedFreeDiveSpawn(
          site,
          meta,
          terrain,
          props,
          spawnSettings(config),
          -6500,
        )!;
        expect(pose).not.toBeNull();
        const position = new THREE.Vector3(pose.x, pose.y, pose.z);
        const forward = new THREE.Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
        const pilot: SubInfo = {
          ...pose,
          vx: 0,
          vy: 0,
          vz: 0,
          fx: forward.x,
          fy: 0,
          fz: forward.z,
          speed: 0,
          lightsOn: true,
          hullR: config.submarine.hullRadius,
        };
        const staged: number[] = [];
        const sim = new LifeSim({
          tier: LIFE_TIERS[tier],
          table: parseLifeDoc(json('data/life/life.json')).sites[site],
          env: { groundAt: (x, z) => terrain.sampleHeight(x, z) },
          seed: 42,
          populate: (sim, pilot) => {
            populateMontereyOpening(sim, pilot, props);
            staged.push(...sim.groups.map((g) => g.id));
          },
        });
        sim.update(1 / 60, pilot);
        const openingGroups = sim.groups.filter((g) => staged.includes(g.id));
        expect(openingGroups.filter((g) => g.def.id === 'pacific-hake')).toHaveLength(2);
        expect(openingGroups.filter((g) => g.def.id === 'sablefish')).toHaveLength(1);
        expect(openingGroups.filter((g) => g.def.id === 'sea-pen')).toHaveLength(1);
        for (const id of ['pacific-hake', 'sablefish', 'sea-pen'])
          expect(sim.countOf(id), id).toBeGreaterThan(0);
        expect(sim.liveCount).toBeLessThanOrEqual(LIFE_TIERS[tier].maxAgents);
        expect(sim.stats().species).toBeLessThanOrEqual(LIFE_TIERS[tier].maxSpecies);
        const rig = new CameraRig(config.camera, 16 / 9, terrain);
        rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
        rig.snap(position, pose.yaw, 0);
        const frustum = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(
            rig.camera.projectionMatrix,
            rig.camera.matrixWorldInverse,
          ),
        );
        const inView = openingGroups
          .flatMap((g) => g.members)
          .filter((a) => a.alive && frustum.containsPoint(new THREE.Vector3(a.x, a.y, a.z)));
        props.group.updateMatrixWorld(true);
        const ray = new THREE.Raycaster();
        const visible = inView.filter((a) => {
          const point = new THREE.Vector3(a.x, a.y + (a.def.archetype === 'sessile' ? 2 : 0), a.z);
          const delta = point.clone().sub(rig.camera.position);
          ray.set(rig.camera.position, delta.clone().normalize());
          ray.far = delta.length() - 1;
          return ray.intersectObject(props.group, true).length === 0;
        });
        for (const id of ['pacific-hake', 'sablefish', 'sea-pen'])
          expect(
            visible.filter((a) => a.def.id === id).length,
            `${id} with a clear wall sightline`,
          ).toBeGreaterThan(0);

        for (const id of ['pacific-hake', 'sablefish', 'sea-pen'])
          expect(inView.filter((a) => a.def.id === id).length, `${id} in view`).toBeGreaterThan(0);
        const targets = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const target = targets.find((p) => p.name === 'North canyon wall')!;
        expect(position.distanceTo(target.position)).toBeLessThan(target.radius);
        expect(frustum.containsPoint(target.position)).toBe(true);
        const scanner = new Scanner(config.scan, new EventBus());
        scanner.setTargets(targets);
        scanner.update(1 / 60, position, forward, false);
        expect(scanner.view.candidateId).toBe(target.id);
        for (let i = 0; i < 600; i++) {
          sim.update(1 / 60, pilot);
          scanner.update(1 / 60, position, forward, true);
        }
        expect(scanner.view.lastCompleteId).toBe(target.id);
        for (const id of ['pacific-hake', 'sablefish', 'sea-pen'])
          expect(sim.countOf(id), `${id} after 10 s`).toBeGreaterThan(0);
        console.log(
          JSON.stringify({
            tier,
            position: position.toArray(),
            scanDistance: position.distanceTo(target.position),
            scanAngle: scanner.view.nearestAngleDeg,
            staged: openingGroups.map((g) => ({ species: g.def.id, count: g.members.length })),
            visible: visible.map((a) => a.def.id),
            stats: sim.stats(),
          }),
        );
        sim.clear();
        sim.update(1 / 60, pilot);
        expect(sim.groups.filter((g) => g.cell === 'monterey-opening')).toHaveLength(1);
      } finally {
        terrain.dispose();
      }
    }, 30_000);
  }
});

it('keeps Monterey lamp gains through mode changes, toggles and ROV retrieval', () => {
  const config = makeConfig();
  const tier = atmosphereTier(config.water, 'low');
  const standard = new Headlights(config.water, tier);
  const monterey = new Headlights(config.water, tier, MONTEREY_OPENING.lamps);
  try {
    for (const preset of Object.values(config.lightPresets)) {
      standard.setPreset(preset);
      monterey.setPreset(preset);
      expect(standard.lights[0]!.intensity).toBe(preset.intensity);
      expect(monterey.lights[0]!.intensity).toBeGreaterThan(standard.lights[0]!.intensity);
      expect(monterey.lights[0]!.distance).toBeGreaterThan(standard.lights[0]!.distance);
      monterey.setEnabled(false);
      monterey.setEnabled(true);
      monterey.update(new THREE.Vector3(), new THREE.Vector3(0, 0, -1), undefined, 0, 1, 0.3);
      expect(monterey.lights[0]!.intensity).toBe(
        preset.intensity * preset.workLight!.intensityFactor,
      );
      monterey.update(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
      expect(monterey.lights[0]!.intensity).toBe(
        preset.intensity * MONTEREY_OPENING.lamps.intensity,
      );
    }
  } finally {
    standard.dispose();
    monterey.dispose();
  }
});
