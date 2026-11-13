import { siteIds } from '../content.js';
// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { afterAll, expect, it, vi } from 'vitest';
import {
  Box2,
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
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
import { missionSystem } from '../../src/app/systems/mission.js';
import type { GameContext } from '../../src/app/context.js';
import goldenOpenings from '../fixtures/mission-opening-poses.json';
import { solidMeshes, subjectVisibility } from './helpers/subjectVisibility.js';
// @ts-expect-error Diagnostics share their fixed capture sizes with Node tools.
import { diagnosticViewports } from '../../tools/diagnostic-tiers.mjs';

// Keep the real mission lifecycle and placement; Node replaces only DOM views.
vi.mock('../../src/ui/Briefing.js', () => ({
  Briefing: class {
    root = { querySelector: () => null };
    isOpen = false;
    startChoice = 'near-site';
    show() {
      this.isOpen = true;
    }
    hide() {
      this.isOpen = false;
    }
    attachDiveSettings() {}
    dispose() {}
  },
}));
vi.mock('../../src/ui/ObjectivesPanel.js', () => ({
  ObjectivesPanel: class {
    setTitle() {}
    setObjectives() {}
    setVisible() {}
    dispose() {}
  },
}));

const sites: string[] = readdirSync('data/landmarks').filter(
  (site: string) => !site.startsWith('_') && !site.endsWith('.json'),
);
const audit: unknown[] = [];
const geometryAudit: unknown[] = [];
const captureAudit =
  (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.SPAWN_AUDIT === '1';
// Keep known clear compositions separate from the unresolved visual framing audit.
const separatedWreckOpenings: Record<string, readonly string[]> = {
  titanic: ['mission'],
  endurance: ['mission', 'free'],
};
// Small vent mounds must remain visible beside the invented scenic geology.
const missionSightlineSites = ['kamaehuakanaloa'];
afterAll(() => {
  if (captureAudit) writeFileSync('.cache/spawn-audit.json', JSON.stringify(audit, null, 2) + '\n');
  if (
    (globalThis as { process?: { env?: Record<string, string> } }).process?.env
      ?.OPENING_GEOMETRY_AUDIT === '1'
  )
    writeFileSync('.cache/opening-geometry.json', JSON.stringify(geometryAudit, null, 2) + '\n');
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

it('covers every declared mission site', () => {
  expect(sites.length).toBeGreaterThan(0);
  expect([...sites].sort()).toEqual([...siteIds].sort());
});

it.each(sites)(
  '%s: every objective can be scanned at its reach and minimum depth with a safe hull',
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
      // Optional surveys must be reachable too; a complete mission must never strand a find.
      for (const objective of mission.objectives) {
        const primary = pois.find((p) => p.id === objective.poi)!;
        expect(primary, objective.id).toBeDefined();
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
              if (
                Math.abs(p.x) > terrain.widthM / 2 - config.submarine.hullRadius ||
                Math.abs(p.z) > terrain.depthM / 2 - config.submarine.hullRadius
              )
                continue;
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
            `${site}/${objective.id}: navigable water within ${radius} m, min_depth_m=${primary.minDepthM}`,
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
  it(`Arcade ${site}: starts 105–300 m from the first primary before and after props load`, async () => {
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
      expect(spatialRange).toBeGreaterThanOrEqual(105);
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

// Five vertical degrees occupy about 65 px in a 900 px / 62 degree opening.
// This is a subject-scale review proxy, independent of scan radius and luminance.
const minimumObjectiveHeightDeg = 5;
// Reviewed small openings remain visible in the audit; a new flag fails the test.
const reviewedSmallOpenings = ['axial-seamount-ashes'];
// Preserve the measured scale achieved by the shipped opening fixes on both layouts.
// These are regression floors, not the aspirational 30% width for future pose work.
const fixedOpeningWidthFloors: Record<string, number> = {
  'beebe-vent-field': 0.25,
  bismarck: 0.6,
  endurance: 0.3,
  'great-blue-hole': 0.21,
  'hunga-tonga-caldera': 0.33,
  'lost-city': 0.38,
  // Centring the marker shows the ledge more end-on (0.195 measured); the 0.19 floor still stops it shrinking.
  'monterey-canyon': 0.19,
  titanic: 0.3,
};

function targetFrame(subject: Object3D, rig: CameraRig) {
  const bounds = new Box2();
  for (const mesh of solidMeshes(subject)) bounds.union(screenBounds(mesh, rig));
  bounds.intersect(new Box2(new Vector2(-1, -1), new Vector2(1, 1)));
  expect(bounds.isEmpty(), 'first scan subject intersects the frame').toBe(false);
  const tanY = Math.tan((rig.camera.fov * Math.PI) / 360);
  const degrees = 180 / Math.PI;
  return {
    widthFraction: (bounds.max.x - bounds.min.x) / 2,
    heightFraction: (bounds.max.y - bounds.min.y) / 2,
    topFraction: (1 - bounds.max.y) / 2,
    centreYFraction: (1 - (bounds.max.y + bounds.min.y) / 2) / 2,
    bottomFraction: (1 - bounds.min.y) / 2,
    widthDeg:
      (Math.atan(bounds.max.x * tanY * rig.camera.aspect) -
        Math.atan(bounds.min.x * tanY * rig.camera.aspect)) *
      degrees,
    heightDeg: (Math.atan(bounds.max.y * tanY) - Math.atan(bounds.min.y * tanY)) * degrees,
  };
}

it.each(sites)(
  '%s: rapid Begin waits for the broad objective face and preserves golden frame width',
  async (site) => {
    const config = makeConfig();
    const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
    const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'high',
    );
    const props = new Props(meta, terrain, config.props, 'high');
    const def = parseMission(
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
    const sub = new Submarine(effective.submarine, terrain);
    sub.setHullClass(requiredHull(def.briefing.depth_m ?? Math.abs(meta.min_m)).id);
    const rig = new CameraRig(effective.camera, 16 / 9, terrain);
    let finishProps!: () => void;
    const propsReady = new Promise<void>((resolve) => {
      finishProps = resolve;
    });
    const ctx = {
      app: { state: 'dive' },
      route: { landmarkId: site, missionId: site, tileId: site, def, skipBriefing: false },
      params: new URLSearchParams(),
      config,
      effective,
      meta,
      terrain,
      props,
      propsReady,
      sub,
      rig,
      discovery: { ready: Promise.resolve(), pois },
      bus: new EventBus(),
      save: { onChange: () => () => {} },
      baseScanRadii: new Map(),
      headlights: { setEnabled: () => {} },
      expose: () => {},
      shellBaseHref: () => 'http://localhost/',
    } as unknown as GameContext;
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => null }) });
    try {
      missionSystem.init!(ctx);
      // The real Begin button hides the card before invoking the router.
      ctx.missionRouter!.briefing!.hide();
      ctx.missionRouter!.begin('near-site');
      await Promise.resolve();
      const frozenBeforeProps = ctx.missionRouter!.frozen;
      await placeProps(props, site);
      props.loaded = true;
      ctx.bus.emit('props:loaded', { ...props.stats });
      finishProps();
      for (let i = 0; i < 5; i++) await Promise.resolve();
      const hero = props.placed.find(
        (p) => p.def.id === siteManifest(site)!.opening!.freeDive!.hero,
      )!;
      rig.camera.updateMatrixWorld(true);
      props.update(rig.camera);
      const frame = targetFrame(hero.root, rig);
      // Compare the same shipped geometry at the recorded golden pose, so art
      // changes cannot masquerade as a heading or camera regression.
      const previous = goldenOpenings.poses[site as keyof typeof goldenOpenings.poses];
      const reference = new CameraRig(effective.camera, 16 / 9, terrain);
      reference.camera.position.fromArray(previous.camera);
      reference.camera.lookAt(
        new Vector3(...previous.position).add(
          new Vector3(
            Math.sin(previous.yaw) * effective.camera.chaseLookAhead,
            effective.camera.chaseLookRise,
            -Math.cos(previous.yaw) * effective.camera.chaseLookAhead,
          ),
        ),
      );
      reference.camera.updateMatrixWorld(true);
      const goldenFrame = targetFrame(hero.root, reference);
      // Horizontal projection onto camera-right measures whether the wide side
      // of a slab/hull is presented instead of its narrow end.
      const centre = hero.root.localToWorld(hero.localBounds.getCenter(new Vector3()));
      const size = hero.localBounds.getSize(new Vector3());
      const faceWidth = (camera: CameraRig) => {
        const right = hero.root
          .worldToLocal(
            centre.clone().add(new Vector3(1, 0, 0).applyQuaternion(camera.camera.quaternion)),
          )
          .sub(hero.root.worldToLocal(centre.clone()))
          .normalize();
        return Math.abs(right.x) * size.x + Math.abs(right.z) * size.z;
      };
      console.log(
        'OPENING-HEADING',
        JSON.stringify({
          site,
          frozenBeforeProps,
          yaw: (sub.yaw * 180) / Math.PI,
          frame: frame.widthFraction,
          golden: goldenFrame.widthFraction,
          face: faceWidth(rig),
          goldenFace: faceWidth(reference),
        }),
      );
      expect(frozenBeforeProps, 'Begin stays frozen until the objective geometry arrives').toBe(
        true,
      );
      expect(ctx.missionRouter!.mission.state).toBe('diving');
      expect(
        frame.widthFraction + 0.001,
        'objective width retains the previous golden',
      ).toBeGreaterThanOrEqual(goldenFrame.widthFraction);
      expect(
        faceWidth(rig) + 1e-6,
        'opening retains the reviewed broad face',
      ).toBeGreaterThanOrEqual(faceWidth(reference));
      const position = sub.position.clone();
      sub.velocity.set(1, 2, 3);
      ctx.bus.emit('props:loaded', { ...props.stats });
      expect(sub.position).toEqual(position);
      expect(sub.velocity.toArray()).toEqual([1, 2, 3]);
    } finally {
      finishProps();
      missionSystem.dispose?.();
      props.dispose();
      terrain.dispose();
      vi.unstubAllGlobals();
    }
  },
);

/** Geometry-only water above the world-horizontal horizon, sampled at cell centres. */
function emptyAboveHorizon(
  rig: CameraRig,
  terrain: Pick<Terrain, 'group' | 'update'>,
  props: Pick<Props, 'group'>,
) {
  terrain.update(rig.camera);
  const solids = [...solidMeshes(terrain.group), ...solidMeshes(props.group)];
  const ray = new Raycaster();
  ray.near = rig.camera.near;
  ray.far = rig.camera.far;
  const columns = 40;
  const rows = 24;
  let above = 0;
  let empty = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      ray.setFromCamera(
        new Vector2((2 * (x + 0.5)) / columns - 1, 1 - (2 * (y + 0.5)) / rows),
        rig.camera,
      );
      if (ray.ray.direction.y <= 0) continue;
      above++;
      if (!ray.intersectObjects(solids, false).length) empty++;
    }
  }
  const forward = rig.camera.getWorldDirection(new Vector3()).setY(0).normalize();
  const horizon = rig.camera.position.clone().addScaledVector(forward, 10000).project(rig.camera);
  return {
    horizonYFraction: (1 - horizon.y) / 2,
    emptyAboveHorizonFraction: empty / (columns * rows),
    emptyShareAboveHorizon: above ? empty / above : 0,
    horizonSamples: { columns, rows, above, empty },
  };
}

it('opening water fractions exclude solid scenery above the horizon and ignore transparent effects', () => {
  const rig = new CameraRig(makeConfig().camera, 16 / 9);
  rig.camera.position.set(0, 0, 0);
  rig.camera.lookAt(0, 0, -1);
  rig.camera.updateMatrixWorld(true);
  const terrain = { group: new Group(), update: () => {} };
  const props = { group: new Group() };
  const geometry = new BoxGeometry(200, 200, 1);
  const material = new MeshBasicMaterial();
  const wall = new Mesh(geometry, material);
  wall.position.set(0, 100, -10);
  try {
    expect(emptyAboveHorizon(rig, terrain, props)).toMatchObject({
      horizonYFraction: 0.5,
      emptyAboveHorizonFraction: 0.5,
      emptyShareAboveHorizon: 1,
    });
    terrain.group.add(wall);
    expect(emptyAboveHorizon(rig, terrain, props).emptyAboveHorizonFraction).toBe(0);
    material.transparent = true;
    material.opacity = 0.5;
    expect(emptyAboveHorizon(rig, terrain, props).emptyAboveHorizonFraction).toBe(0.5);
  } finally {
    geometry.dispose();
    material.dispose();
  }
});

it.each(
  sites.flatMap((site) =>
    diagnosticViewports.map((viewport: { width: number; height: number }) => ({
      site,
      ...viewport,
      expectedFlag: reviewedSmallOpenings.includes(site),
    })),
  ),
)(
  '$site $width×$height: mission opening objective angular size review and frame fractions',
  async ({ site, width, height, expectedFlag }) => {
    const config = makeConfig();
    const effective = resolveEffective(defaultSettings(config), 'arcade', null, config);
    const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const terrain = new Terrain(
      { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
      config.terrain,
      'high',
    );
    const props = new Props(meta, terrain, config.props, 'high');
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
      const primaries = mission.objectives
        .filter((o) => o.primary)
        .map((o) => pois.find((p) => p.id === o.poi)!);
      const pose = runtimeMissionSpawn(
        site,
        primaries,
        meta,
        terrain,
        props,
        spawnSettings(config),
        config.submarine.hullClasses[mission.hull_class!].ratedDepth,
        effective.camera,
      );
      expect(pose).not.toBeNull();
      const position = new Vector3(pose!.x, pose!.y, pose!.z);
      const rig = new CameraRig(effective.camera, width / height, terrain);
      rig.setChaseRadiusDefault(
        pose!.chaseRadius,
        pose!.chaseOffsetX,
        pose!.chaseOffsetY,
        pose!.portraitChaseOffset,
      );
      rig.snap(position, pose!.yaw, 0);
      rig.camera.updateMatrixWorld(true);
      props.update(rig.camera);
      // The manifest's opening hero represents the first objective at every shipped site.
      // Do not substitute the much larger POI scan sphere for physical subject geometry.
      const subjectId = siteManifest(site)!.opening!.freeDive!.hero;
      const subject = props.placed.find((p) => p.def.id === subjectId)!;
      expect(subject).toBeDefined();
      expect(subject.root.visible).toBe(true);
      expect(subject.root.position.distanceTo(primaries[0].position)).toBeLessThan(
        primaries[0].radius,
      );
      const frame = targetFrame(subject.root, rig);
      const degrees = 180 / Math.PI;
      const { heightDeg } = frame;
      const flagged = heightDeg < minimumObjectiveHeightDeg;
      const row = {
        site,
        objective: primaries[0].id,
        subject: subjectId,
        viewport: { width, height },
        pose,
        configuredCameraDistanceM: rig.chaseRadius,
        cameraDistanceM: rig.camera.position.distanceTo(position),
        cameraPitchDeg: Math.asin(rig.camera.getWorldDirection(new Vector3()).y) * degrees,
        objectiveDistanceM: position.distanceTo(primaries[0].position),
        ...frame,
        ...emptyAboveHorizon(rig, terrain, props),
        heightPx: frame.heightFraction * height,
        flagged,
      };
      geometryAudit.push(row);
      expect(Number.isFinite(heightDeg)).toBe(true);
      expect(heightDeg).toBeGreaterThan(0);
      const widthFloor = fixedOpeningWidthFloors[site];
      if (widthFloor !== undefined)
        expect(
          frame.widthFraction,
          `${site} ${width}×${height}: fixed opening target width`,
        ).toBeGreaterThanOrEqual(widthFloor);
      for (const fraction of [
        frame.widthFraction,
        frame.heightFraction,
        frame.topFraction,
        frame.bottomFraction,
      ]) {
        expect(fraction).toBeGreaterThanOrEqual(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
      expect(flagged, `${site}: objective height ${heightDeg.toFixed(2)}°; review below 5°`).toBe(
        expectedFlag,
      );
      console.log(`OPENING-GEOMETRY ${JSON.stringify(row)}`);
      if (flagged) console.warn(`${site}: FLAG objective height ${heightDeg.toFixed(2)}° < 5°`);
    } finally {
      props.dispose();
      terrain.dispose();
    }
  },
);

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
      const sightlines: unknown[] = [];
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
        if (kind === 'mission' && missionSightlineSites.includes(site)) {
          const authored = siteManifest(site)!.opening!;
          const subjectId =
            authored.reframe?.aimHero ?? authored.reframe?.hero ?? authored.freeDive!.hero;
          const subject = props.placed.find((p) => p.def.id === subjectId)!;
          expect(subject).toBeDefined();
          // The authored subject must represent the first required contact, not remote scenery.
          expect(subject.root.position.distanceTo(target.position)).toBeLessThan(target.radius);
          for (const [width, height] of [
            [1600, 900],
            [390, 844],
            [844, 390],
          ]) {
            const rig = new CameraRig(effective.camera, width / height, terrain);
            // The pilot view must see the contact from the opening; the authored
            // chase arm is checked separately and can place the hull over a small vent.
            rig.setMode('first-person');
            rig.snap(position, opening.yaw, 0);
            terrain.update(rig.camera);
            props.update(rig.camera);
            expect(subject.root.visible).toBe(true);
            // The authored vent subject itself must be visible. A neighbouring
            // chimney cannot stand in for an obscured opening subject.
            const body = solidMeshes(subject.root)[0];
            expect(body).toBeDefined();
            const solids = [...solidMeshes(terrain.group), ...solidMeshes(props.group)];
            const visible = subjectVisibility(body, solids, rig.camera);
            sightlines.push({ width, height, subjectId, visible });
            expect(
              visible,
              `${width}x${height} ${target.id}: the opening subject's middle and upper body are visible`,
            ).toEqual([true, true]);
            expect(props.collide(rig.camera.position.clone(), 1, new Vector3())).toBe(false);
          }
        }
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
      expect(range).toBeGreaterThanOrEqual(105 - 0.01);
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
      const routeTargets = missionSightlineSites.includes(site) ? primaries : [target];
      scanner.setTargets(
        routeTargets.map((p) => ({
          ...p,
          radius: resolveScanRadius(
            missionApproachScanRadius(site, p.radius) * effective.sensor.scanRadiusMultiplier,
            effective.scan,
          ),
        })),
      );
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
      // Continue from the opening through every required contact at this site;
      // standalone scannable poses do not prove the next leg is navigable.
      for (const target of routeTargets) {
        const radius = resolveScanRadius(
          missionApproachScanRadius(site, target.radius) * effective.sensor.scanRadiusMultiplier,
          effective.scan,
        );
        scanner.setObjective(target.id);
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
          input.pitch = Math.max(
            -1,
            Math.min(1, (Math.atan2(delta.y, horizontal) - sub.pitch) * 4),
          );
          input.ballast =
            horizontal < radius * 0.8 ? Math.max(-1, Math.min(1, (delta.y + 16) / 10)) : 0;
          if (missionSightlineSites.includes(site)) {
            scanner.update(0, sub.position, sub.getForward(), false);
            const cue = scanner.view;
            input.throttle =
              cue.candidateId !== target.id &&
              Math.abs(cue.objectiveTurnDeg) < 15 &&
              delta.length() > radius * 0.8
                ? 0.5
                : 0;
            input.yaw = Math.max(-1, Math.min(1, cue.objectiveTurnDeg / 20));
            input.ballast = Math.max(
              -1,
              Math.min(1, (target.position.y + 16 - sub.position.y) / 8 - sub.velocity.y),
            );
          }
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
          targetId: target.id,
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
          sightlines,
        });
        expect(completedAt, 'navigate from the opening and complete the real scan').not.toBeNull();
        expect(completedAt!).toBeGreaterThan(target.scanSeconds);
        expect(completedAt!).toBeLessThanOrEqual(120);
        expect(contactFrames, `${target.id}: scan approach clears prop collisions`).toBe(0);
        expect(sub.hullBreached).toBe(false);
        expect(minimumClearance).toBeGreaterThanOrEqual(
          settings.hullRadius + settings.seabedClearance - 1e-6,
        );
      }
    } finally {
      mesh.dispose();
      props.dispose();
      terrain.dispose();
    }
  },
);
