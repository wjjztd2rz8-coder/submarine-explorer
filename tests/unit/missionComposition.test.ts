// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it, vi } from 'vitest';
import {
  Box2,
  InstancedMesh,
  Matrix4,
  Mesh,
  Raycaster,
  Vector2,
  Vector3,
  Texture,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { makeConfig } from '../../src/core/Config.js';
import { parseMission } from '../../src/game/Mission.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import {
  composedMissionSpawn,
  MISSION_APPROACH_M,
  missionApproachScanRadius,
  spawnSettings,
} from '../../src/game/Spawn.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';
import { Scanner, resolveScanRadius } from '../../src/game/Scanner.js';
import { EventBus } from '../../src/core/EventBus.js';
import { defaultSettings } from '../../src/core/Save.js';
import { resolveEffective } from '../../src/game/EffectiveSettings.js';
import { Submarine } from '../../src/sub/Submarine.js';
import { FROZEN_INPUT } from '../../src/game/MissionRouter.js';
import {
  composedFreeDiveSpawn,
  composedMissionSpawn as runtimeMissionSpawn,
} from '../../src/game/DeepOpeningSpawn.js';
import { PropContact } from '../../src/world/props/Wiring.js';
import { ModelCache } from '../../src/world/PropLoader.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { hullClearance } from './helpers/hullClearance.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import { requiredHull } from '../../src/game/Progress.js';

const sites: string[] = readdirSync('data/landmarks').filter(
  (site: string) => !site.startsWith('_') && !site.endsWith('.json'),
);
const audit: unknown[] = [];
const captureAudit =
  (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.SPAWN_AUDIT === '1';
// Keep known clear compositions separate from the unresolved visual framing audit.
const separatedWreckOpenings: Record<string, readonly string[]> = {
  titanic: ['mission'],
  endurance: ['mission', 'free'],
};
afterAll(() => {
  if (captureAudit) writeFileSync('.cache/spawn-audit.json', JSON.stringify(audit, null, 2) + '\n');
});

/** Load every shipped prop with real geometry; image decoding alone is replaced in Node. */
async function placeProps(props: Props, site: string): Promise<void> {
  const models = vi.spyOn(ModelCache.prototype, 'get').mockImplementation(async (url) => {
    const loader = new GLTFLoader();
    loader.register(() => ({
      name: 'headless-textures',
      loadTexture: async () => new Texture(),
    }));
    const data = readFileSync(`public${url}`);
    return (
      await loader.parseAsync(
        data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        '',
      )
    ).scene;
  });
  try {
    await props.placeAll(
      JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8')),
      site,
    );
    expect(props.stats.failed).toBe(0);
    expect(props.stats.skipped).toBe(0);
  } finally {
    models.mockRestore();
  }
}

it('covers all 13 authored mission sites', () => {
  expect(sites).toHaveLength(13);
});

it.each(sites)(
  '%s: every primary can be scanned at its reach and minimum depth with a safe hull',
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
      await placeProps(props, site);
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
      for (const objective of mission.objectives.filter((o) => o.primary)) {
        const primary = pois.find((p) => p.id === objective.poi)!;
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
      }
    } finally {
      props.dispose();
      terrain.dispose();
    }
  },
);

for (const site of sites) {
  it(`Arcade ${site}: starts 110–300 m from the first primary before and after props load`, async () => {
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
      expect(spatialRange).toBeGreaterThanOrEqual(110);
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
      await placeProps(props, site);
      check();
    } finally {
      props.dispose();
      terrain.dispose();
    }
  });
}

/** Project actual visible vertices, including instance transforms and excluding hidden effects. */
function screenBounds(root: Object3D, rig: CameraRig): Box2 {
  const bounds = new Box2();
  const instance = new Matrix4();
  const world = new Matrix4();
  const point = new Vector3();
  root.updateMatrixWorld(true);
  root.traverseVisible((object) => {
    if (!(object instanceof Mesh)) return;
    const vertices = object.geometry.getAttribute('position');
    for (let i = 0; i < (object instanceof InstancedMesh ? object.count : 1); i++) {
      if (object instanceof InstancedMesh) object.getMatrixAt(i, instance);
      else instance.identity();
      world.multiplyMatrices(object.matrixWorld, instance);
      for (let j = 0; j < vertices.count; j++) {
        point.fromBufferAttribute(vertices, j).applyMatrix4(world).project(rig.camera);
        bounds.expandByPoint(new Vector2(point.x, point.y));
      }
    }
  });
  return bounds;
}

it.each(
  sites.flatMap((site) => (['low', 'medium', 'high'] as const).map((tier) => ({ site, tier }))),
)(
  '$site $tier: opening hulls clear terrain/props and the first scan is reachable with runtime contact',
  async ({ site, tier }) => {
    const config = makeConfig();
    const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
    const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      tier,
    );
    const props = new Props(meta, terrain, config.props, tier);
    const mission = parseMission(
      JSON.parse(readFileSync(`data/landmarks/${site}/mission.json`, 'utf8')),
      site,
    )!;
    const missionHull = requiredHull(mission.briefing.depth_m ?? Math.abs(meta.min_m)).id;
    const mesh = new SubMesh({ length: 26, hullClass: missionHull, tier });
    try {
      await placeProps(props, site);
      const pois = placePois(
        parsePois(JSON.parse(readFileSync(`data/landmarks/${site}/pois.json`, 'utf8'))),
        meta,
        terrain,
        config.scan,
        site,
      );
      const primaries = mission.objectives
        .filter((o) => o.primary)
        .map((o) => pois.find((p) => p.id === o.poi)!);
      const target = primaries[0];
      const settings = spawnSettings(config);
      const ratedDepth = config.submarine.hullClasses[missionHull].ratedDepth;
      const pose = runtimeMissionSpawn(
        site,
        primaries,
        meta,
        terrain,
        props,
        settings,
        ratedDepth,
        effective.camera,
      )!;
      expect(pose).not.toBeNull();
      const freeHull = requiredHull(Math.abs(meta.min_m)).id;
      const free = composedFreeDiveSpawn(
        site,
        meta,
        terrain,
        props,
        settings,
        config.submarine.hullClasses[freeHull].ratedDepth,
        effective.camera,
      )!;
      expect(free).not.toBeNull();
      const clearances: Record<string, number> = {};
      const wrecks: Record<string, number[]> = {};
      const silhouetteWitnesses: Record<string, number[]> = {};
      for (const [kind, opening, hull] of [
        ['mission', pose, missionHull],
        ['free', free, freeHull],
      ] as const) {
        const position = new Vector3(opening.x, opening.y, opening.z);
        mesh.setHullClass(hull);
        mesh.setView('chase');
        mesh.setPose(position, opening.yaw, 0, 0);
        clearances[kind] = hullClearance(mesh.group, terrain);
        expect(clearances[kind], `${kind}: visible hull above terrain`).toBeGreaterThan(0);
        expect(
          props.collide(position.clone(), settings.hullRadius + 4, new Vector3()),
          `${kind}: prop keepout`,
        ).toBe(false);
        expect(position.y).toBeLessThanOrEqual(-settings.hullRadius);
        expect(position.y).toBeGreaterThanOrEqual(
          config.submarine.hullClasses[hull].ratedDepth + settings.hullRadius,
        );
        const hero = props.placed.find(
          (p) => p.def.id === siteManifest(site)?.opening?.freeDive?.hero,
        );
        if (hero?.def.wreck && hero.def.procedural === 'hull-block') {
          wrecks[kind] = [];
          for (const [width, height] of [
            [1600, 900],
            [390, 844],
            [844, 390],
          ]) {
            const rig = new CameraRig(effective.camera, width / height, terrain);
            rig.setPhoneLandscape(width === 844);
            rig.setChaseRadiusDefault(
              opening.chaseRadius,
              opening.chaseOffsetX,
              opening.chaseOffsetY,
              opening.portraitChaseOffset,
            );
            rig.snap(position, opening.yaw, 0);
            rig.camera.updateMatrixWorld(true);
            const sub = screenBounds(mesh.vehicle.root, rig);
            const wreck = screenBounds(hero.full, rig);
            const intersection = sub.clone().intersect(wreck);
            const size = intersection.getSize(new Vector2());
            // Conservative screen envelopes are audit evidence, not a claim of triangle occlusion.
            const area = (size.x * size.y * width * height) / 4;
            wrecks[kind].push(area);
            if (separatedWreckOpenings[site]?.includes(kind))
              expect(area, `${kind} ${width}x${height}: wreck clears the sub envelope`).toBe(0);
            // An audit witness must hit both actual silhouettes on the same camera ray.
            // Bounds alone can report empty water between spars, railings and rusticles.
            if (captureAudit && area > 0 && width === 1600) {
              const ray = new Raycaster();
              for (let i = 0; i < 20 && !silhouetteWitnesses[kind]; i++) {
                for (let j = 0; j < 20 && !silhouetteWitnesses[kind]; j++) {
                  const ndc = new Vector2(
                    intersection.min.x + (size.x * (i + 0.5)) / 20,
                    intersection.min.y + (size.y * (j + 0.5)) / 20,
                  );
                  ray.setFromCamera(ndc, rig.camera);
                  const boatHit = ray.intersectObject(mesh.vehicle.root, true)[0];
                  const wreckHit = ray.intersectObject(hero.full, true)[0];
                  if (boatHit && wreckHit)
                    silhouetteWitnesses[kind] = [
                      ((ndc.x + 1) * width) / 2,
                      ((1 - ndc.y) * height) / 2,
                      boatHit.distance,
                      wreckHit.distance,
                    ];
                }
              }
            }
          }
        }
      }
      const range = target.position.distanceTo(new Vector3(pose.x, pose.y, pose.z));
      expect(range).toBeCloseTo(MISSION_APPROACH_M[site], 2);
      expect(range).toBeGreaterThanOrEqual(110);
      expect(range).toBeLessThanOrEqual(300);
      const radius = resolveScanRadius(
        missionApproachScanRadius(site, target.radius) * effective.sensor.scanRadiusMultiplier,
        effective.scan,
      );
      expect(range).toBeGreaterThan(radius);
      const sub = new Submarine(effective.submarine, terrain);
      sub.setHullClass(missionHull);
      sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      const bus = new EventBus();
      const contact = new PropContact(props, bus, config.props, settings.hullRadius);
      const scanner = new Scanner(effective.scan, bus);
      scanner.setTargets([{ ...target, radius }]);
      scanner.setObjective(target.id);
      scanner.update(0, sub.position, sub.getForward(), false);
      expect(scanner.view.objectiveTurnDeg).toBeCloseTo(
        -(siteManifest(site)?.opening?.mission?.yawOffset ?? 0),
        3,
      );
      // Aim directly at the objective so range alone must prevent an opening scan,
      // including Arcade's radius floor after the per-site cap and sensor scaling.
      scanner.update(
        target.scanSeconds + 1,
        sub.position,
        target.position.clone().sub(sub.position).normalize(),
        true,
      );
      expect(scanner.view.objectiveInRange).toBe(false);
      expect(scanner.view.candidateId).toBeNull();
      expect(scanner.view.progress).toBe(0);
      expect(scanner.isScanned(site, target.id)).toBe(false);
      const input = { ...FROZEN_INPUT, scan: true };
      let completedAt: number | null = null;
      let contactFrames = 0;
      let minimumClearance = Infinity;
      for (let tick = 0; tick < 7200; tick++) {
        const delta = target.position.clone().sub(sub.position);
        const horizontal = Math.hypot(delta.x, delta.z);
        const desiredYaw = Math.atan2(delta.x, -delta.z);
        input.throttle = delta.length() > radius * 0.8 ? 1 : 0;
        input.yaw = Math.max(
          -1,
          Math.min(1, Math.atan2(Math.sin(desiredYaw - sub.yaw), Math.cos(desiredYaw - sub.yaw))),
        );
        input.pitch = Math.max(-1, Math.min(1, (Math.atan2(delta.y, horizontal) - sub.pitch) * 4));
        input.ballast =
          horizontal < radius * 0.8 ? Math.max(-1, Math.min(1, (delta.y + 16) / 10)) : 0;
        sub.step(input, 1 / 60);
        if (contact.resolve(sub, 1 / 60)) contactFrames++;
        minimumClearance = Math.min(
          minimumClearance,
          sub.position.y - terrain.sampleHeight(sub.position.x, sub.position.z),
        );
        scanner.update(1 / 60, sub.position, sub.getForward(), true);
        if (scanner.isScanned(site, target.id)) {
          completedAt = (tick + 1) / 60;
          break;
        }
      }
      audit.push({
        site,
        tier,
        range,
        radius,
        missionHull,
        freeHull,
        clearances,
        completedAt,
        contactFrames,
        minimumClearance,
        wreckEnvelopeOverlapPx2: wrecks,
        silhouetteWitnesses,
      });
      expect(completedAt, 'navigate from the opening and complete the real scan').not.toBeNull();
      expect(completedAt!).toBeGreaterThan(target.scanSeconds);
      expect(completedAt!).toBeLessThanOrEqual(120);
      expect(contactFrames, 'first scan approach clears prop collisions').toBe(0);
      expect(sub.hullBreached).toBe(false);
      expect(minimumClearance).toBeGreaterThanOrEqual(
        settings.hullRadius + settings.seabedClearance - 1e-6,
      );
    } finally {
      mesh.dispose();
      props.dispose();
      terrain.dispose();
    }
  },
);
