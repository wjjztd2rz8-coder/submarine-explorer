// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import {
  Box3,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Sphere,
  Vector2,
  Vector3,
} from 'three';
import { expect, test } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import type { GraphicsTier } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { parsePois, placePois, spawnPoseForPoi } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { visitHullVertices } from './helpers/hullClearance.js';
import { partitionedRaycast } from './helpers/partitionedRaycast.js';
import { reticleClearOfControls } from '../../src/ui/ScanReticleLayout.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import poses from '../../tools/lowtier-poses.json';
import blueHolePoses from '../../tools/blue-hole-poses.json';
// @ts-expect-error CPU diagnostic projection is shared with Node tools.
import { projectCoverage } from '../../tools/lib/pose-projection.mjs';
import titanicPoses from '../../tools/titanic-poses.json';
import { withArcadeReach } from './helpers.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import { parseMission } from '../../src/game/Mission.js';
import { siteLightWater } from '../../src/core/config/atmosphere.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { solidMeshes, subjectVisibility } from './helpers/subjectVisibility.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
async function scene(site: string, tier: GraphicsTier = 'low', content?: unknown) {
  const config = makeConfig();
  const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
  const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
  const terrain = new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    tier,
  );
  const props = new Props(meta, terrain, config.props, tier);
  await props.placeAll(content ?? json(`data/landmarks/${site}/props.json`), site);
  props.group.updateMatrixWorld(true);
  terrain.group.updateMatrixWorld(true);
  return { config, meta, terrain, props };
}

test('Blake portrait: the 44 px reticle corner cannot overlap SCAN or another control', () => {
  const scan = { left: 210, right: 311, top: 786, bottom: 832 };
  // The original centre is outside SCAN, but its bottom-right corner crosses it.
  expect(reticleClearOfControls({ x: 217, y: 794 }, 44, [scan])).toBe(false);
  expect(reticleClearOfControls({ x: 217, y: 760 }, 44, [scan])).toBe(true);
  expect(reticleClearOfControls({ x: 217, y: 794 }, 44, [])).toBe(true);
  expect(reticleClearOfControls({ x: 188, y: 808 }, 44, [scan])).toBe(true);
});

test('d-scan Titanic fixture: extended sensors keep the logged bow ahead of the remote debris hint', () => {
  const config = makeConfig();
  const sensor = config.sensorPresets.extended;
  config.scan.hintRangeFactor *= sensor.hintRangeMultiplier;
  const meta = json('data/tiles/titanic/meta.json') as TileMeta;
  const bytes = readFileSync('data/tiles/titanic/heightmap.bin');
  const terrain = new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    'low',
  );
  try {
    const pois = placePois(
      parsePois(json('data/landmarks/_test/pois.json')),
      meta,
      terrain,
      config.scan,
      '_test',
    );
    for (const poi of pois) poi.radius *= sensor.scanRadiusMultiplier;
    const bow = pois.find((p) => p.id === 'test-bow')!;
    const debris = pois.find((p) => p.id === 'test-debris')!;
    const pose = spawnPoseForPoi(
      bow,
      terrain,
      config.scan,
      config.submarine.hullRadius + config.submarine.seabedClearance,
    );
    const position = new Vector3(pose.x, pose.y, pose.z);
    const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
    const remoteDistance = debris.position.distanceTo(position);
    expect(remoteDistance).toBeGreaterThan(debris.radius);
    expect(remoteDistance).toBeLessThan(debris.radius * config.scan.hintRangeFactor);
    const scanner = new Scanner(config.scan, new EventBus());
    scanner.setTargets(pois);
    scanner.update(bow.scanSeconds, position, forward, true);
    expect(scanner.view.lastCompleteId).toBe('test-bow');
    scanner.update(0, position, forward, false);
    expect(scanner.view.nearestId).toBe('test-bow');
    expect(scanner.view.nearestInRange).toBe(true);
    expect(scanner.view.nearestScanned).toBe(true);
    scanner.update(bow.scanSeconds + 0.6, position, forward, true);
    expect(scanner.view.completed).toBe(1);
  } finally {
    terrain.dispose();
  }
});

for (const tier of ['low', 'medium', 'high'] as const) {
  // Regression guard: scenic geology hid the vent; moving its anchor also raised
  // the opening until the required contact fell outside the level scan beam.
  test.each(['shipped', 'renamed subject'])(
    `Kamaehuakanaloa ${tier} %s: free and mission openings frame a lit subject with a clear camera and scan approach`,
    async (variant) => {
      const site = 'kamaehuakanaloa';
      const manifest = siteManifest(site)!;
      const original = manifest.opening;
      const content = json(`data/landmarks/${site}/props.json`);
      if (variant !== 'shipped') {
        // Neither a prop id nor the pillow footprint should
        // define this capability. Keep every reference to the renamed subject valid.
        const opening = structuredClone(original)!;
        const subjectId =
          opening.reframe?.aimHero ?? opening.reframe?.hero ?? opening.freeDive!.hero;
        const vent = content.props.find((p: { id: string }) => p.id === subjectId);
        expect(vent).toBeDefined();
        vent.id = 'renamed-vent-subject';
        if (opening.freeDive?.hero === subjectId) opening.freeDive.hero = vent.id;
        if (opening.reframe?.hero === subjectId) opening.reframe.hero = vent.id;
        if (opening.reframe?.aimHero === subjectId) opening.reframe.aimHero = vent.id;
        manifest.opening = opening;
      }
      const { config, meta, terrain, props } = await scene(site, tier, content);
      try {
        const authored = siteManifest(site)!.opening!;
        const subjectId =
          authored.reframe?.aimHero ?? authored.reframe?.hero ?? authored.freeDive!.hero;
        const subject = props.placed.find((p) => p.def.id === subjectId)!;
        expect(subject).toBeDefined();
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        );
        const mission = parseMission(json(`data/landmarks/${site}/mission.json`), site)!;
        const primaries = mission.objectives
          .filter((o) => o.primary)
          .map((o) => pois.find((p) => p.id === o.poi)!);
        const target = primaries[0];
        expect(subject.root.position.distanceTo(target.position)).toBeLessThan(target.radius);
        const settings = spawnSettings(config);
        const ratedDepth = config.submarine.hullClasses[mission.hull_class!].ratedDepth;
        for (const [kind, pose] of [
          [
            'free',
            composedFreeDiveSpawn(site, meta, terrain, props, settings, ratedDepth, config.camera),
          ],
          [
            'mission',
            composedMissionSpawn(
              site,
              primaries,
              meta,
              terrain,
              props,
              settings,
              ratedDepth,
              config.camera,
            ),
          ],
        ] as const) {
          expect(pose).not.toBeNull();
          const position = new Vector3(pose!.x, pose!.y, pose!.z);
          if (kind === 'free') {
            const scanner = new Scanner(config.scan, new EventBus());
            scanner.setTargets(pois);
            scanner.update(
              0,
              position,
              new Vector3(Math.sin(pose!.yaw), 0, -Math.cos(pose!.yaw)),
              false,
            );
            expect(scanner.view.nearestDistance).toBeLessThanOrEqual(target.radius);
            expect(scanner.view.candidateId).toBe(target.id);
          }
          expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
            false,
          );
          expect(position.y - terrain.sampleHeight(position.x, position.z)).toBeGreaterThanOrEqual(
            settings.hullRadius + settings.seabedClearance,
          );
          for (const [width, height] of [
            [390, 844],
            [1280, 720],
            [844, 390],
          ]) {
            const rig = new CameraRig(config.camera, width / height, terrain);
            rig.setChaseRadiusDefault(
              pose!.chaseRadius,
              pose!.chaseOffsetX,
              pose!.chaseOffsetY,
              pose!.portraitChaseOffset,
            );
            rig.snap(position, pose!.yaw, 0);
            terrain.update(rig.camera);
            props.update(rig.camera);
            expect(subject.root.visible).toBe(true);
            const body = solidMeshes(subject.root)[0];
            expect(body).toBeDefined();
            const solids = [...solidMeshes(terrain.group), ...solidMeshes(props.group)];
            expect(
              subjectVisibility(body, solids, rig.camera),
              `${kind} ${width}x${height}: middle and upper body visible, not just plume or tip`,
            ).toEqual([true, true]);
            expect(props.collide(rig.camera.position.clone(), 1, new Vector3())).toBe(false);
            expect(
              rig.camera.position.y -
                terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z),
            ).toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
            const light = sampleAtmosphere(siteLightWater(site, tier, config.water), position.y);
            const c = light.ambientColor;
            expect(
              light.ambientIntensity * (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b),
              'readable subject fill at the opening depth',
            ).toBeGreaterThan(0.8);
            // An opaque foreground obstruction must still fail the capability pin.
            const blocker = new Mesh(new BoxGeometry(1000, 1000, 1), new MeshBasicMaterial());
            blocker.position
              .copy(rig.camera.position)
              .addScaledVector(rig.camera.getWorldDirection(new Vector3()), 2);
            blocker.quaternion.copy(rig.camera.quaternion);
            blocker.updateMatrixWorld(true);
            expect(subjectVisibility(body, [...solids, blocker], rig.camera)).toEqual([
              false,
              false,
            ]);
            blocker.geometry.dispose();
            blocker.material.dispose();
          }
        }
      } finally {
        manifest.opening = original;
        props.dispose();
        terrain.dispose();
      }
    },
  );
}

test('Hunga Tonga Low: the detail pose centres the cliff rather than the sediment apron', async () => {
  const { config, terrain, props } = await scene('hunga-tonga-caldera');
  try {
    const hero = props.placed.find((p) => p.def.id === 'caldera-tuff-wall')!;
    const fixed = poses['hunga-tonga-caldera'];
    const target = hero.root.localToWorld(new Vector3().fromArray(fixed.target));
    const position = target
      .clone()
      .addScaledVector(new Vector3().fromArray(fixed.direction), fixed.close.range);
    position.y = hero.root.position.y + fixed.close.above;
    const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
    const pitch = Math.atan2(target.y - position.y, fixed.close.range);
    const rig = new CameraRig(config.camera, 390 / 844, terrain);
    rig.setMode('first-person');
    rig.snap(position, yaw, pitch);
    const eye = rig.camera.position;
    rig.lookElevation =
      (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) / 0.55;
    rig.snap(position, yaw, pitch);
    rig.camera.updateMatrixWorld(true);
    expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(false);
    const projected = target.clone().project(rig.camera);
    expect(Math.abs(projected.x)).toBeLessThan(0.1);
    expect(Math.abs(projected.y)).toBeLessThan(0.1);
    let cliffHits = 0;
    for (const x of [-0.55, -0.275, 0, 0.275, 0.55]) {
      for (const y of [-0.3, -0.1125, 0.075, 0.2625, 0.45]) {
        const ray = new Raycaster();
        ray.setFromCamera(new Vector2(x, y), rig.camera);
        // The first child is the wall; exclude the separately built sediment apron.
        const cliff = ray.intersectObject(hero.full.children[0], true)[0];
        const floor = ray.intersectObject(terrain.group, true)[0];
        if (cliff && cliff.distance < (floor?.distance ?? Infinity)) cliffHits++;
      }
    }
    console.log('HUNGA cliffHits', cliffHits);
    // Seen from the open (west) side the wall is a narrower silhouette than from behind.
    // The tapering, notched crest leaves gaps in the skyline, so only a few of the 25 rays hit rock;
    // an apron-centred view would hit none (the apron is excluded), so a handful still proves it.
    expect(cliffHits).toBeGreaterThanOrEqual(4);
    const crest = new Vector3().fromArray(fixed.target);
    crest.y = hero.def.dimensionsM![2];
    hero.root.localToWorld(crest).project(rig.camera);
    expect(crest.y).toBeLessThan(0.48); // Below the portrait telemetry/scan stack.
    expect(crest.y).toBeGreaterThan(0.1);
    const wall = hero.full.children[0] as Mesh;
    const vertices = wall.geometry.getAttribute('position');
    let top = -Infinity;
    for (let i = 0; i < vertices.count; i++) {
      const point = new Vector3()
        .fromBufferAttribute(vertices, i)
        .applyMatrix4(wall.matrixWorld)
        .project(rig.camera);
      // Rear vertices behind the eye cannot define the visible silhouette.
      if (point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.88) top = Math.max(top, point.y);
    }
    console.log('HUNGA actual wall top NDC', top);
    expect(top).toBeLessThan(0.48);
  } finally {
    terrain.dispose();
  }
});

test('Blue Hole Low: both east poses guide to their local unscanned gallery before and after the west scan', async () => {
  const site = 'great-blue-hole';
  const { config, meta, terrain, props } = await scene(site);
  try {
    const pois = withArcadeReach(
      placePois(
        parsePois(json(`data/landmarks/${site}/pois.json`)),
        meta,
        terrain,
        config.scan,
        site,
      ),
    );
    const hero = props.placed.find((p) => p.def.id === 'karst-grotto-east')!;
    const fixed = blueHolePoses.east;
    const target = hero.root.localToWorld(new Vector3().fromArray(fixed.target));
    for (const westScanned of [false, true]) {
      const scanner = new Scanner(config.scan, new EventBus());
      scanner.setTargets(pois);
      if (westScanned) scanner.scannedThisDive.add(`${site}/great-blue-hole-stalactites`);
      for (const range of [fixed.approachRange, fixed.close.range]) {
        const close = range === fixed.close.range ? fixed.close : null;
        const position = target
          .clone()
          .addScaledVector(new Vector3().fromArray(fixed.direction), range);
        position.x -= fixed.direction[2] * (close?.lateral ?? 0);
        position.z += fixed.direction[0] * (close?.lateral ?? 0);
        position.y = hero.root.position.y + (close?.above ?? fixed.above);
        scanner.update(0, position, target.clone().sub(position).normalize(), false);
        expect(scanner.view.nearestId).toBe('great-blue-hole-stalactites-east');
        expect(scanner.view.candidateId).toBe(scanner.view.nearestId);
        expect(scanner.view.nearestScanned).toBe(false);
        expect(scanner.view.nearestDistance).toBeLessThan(100);
        expect(Math.abs(scanner.view.nearestTurnDeg)).toBeLessThan(20);
      }
    }
  } finally {
    terrain.dispose();
  }
});

test.each(['low', 'medium', 'high'] as const)(
  'Titanic %s: authored approach and close poses keep hull and camera clear',
  async (tier) => {
    const { config, terrain, props } = await scene('titanic', tier);
    try {
      expect(props.stats.failed).toBe(0);
      for (const [id, pose] of Object.entries(titanicPoses)) {
        const hero = props.placed.find((p) => p.def.id === id)!;
        expect(hero).toBeDefined();
        expect(
          [
            ...pose.target,
            ...pose.direction,
            pose.above,
            pose.approachRange,
            pose.close.range,
            pose.close.above,
          ].every(Number.isFinite),
        ).toBe(true);
        expect(new Vector3().fromArray(pose.direction).length()).toBeCloseTo(1, 2);
        expect(pose.close.range).toBeGreaterThan(0);
        expect(pose.approachRange).toBeGreaterThan(pose.close.range);
        const target = hero.root.localToWorld(new Vector3().fromArray(pose.target));
        for (const [range, above] of [
          [pose.approachRange, pose.above],
          [pose.close.range, pose.close.above],
        ]) {
          const position = target
            .clone()
            .addScaledVector(new Vector3().fromArray(pose.direction), range);
          position.y = hero.root.position.y + above;
          expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
            false,
          );
          // Frozen capture physics must not conceal a hull embedded in the seabed.
          expect
            .soft(position.y - terrain.sampleHeight(position.x, position.z))
            .toBeGreaterThan(config.submarine.hullRadius + config.submarine.seabedClearance);
          const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
          const pitch = Math.atan2(target.y - position.y, range);
          const rig = new CameraRig(config.camera, 16 / 9, terrain);
          rig.setMode('first-person');
          rig.snap(position, yaw, pitch);
          const eye = rig.camera.position;
          rig.lookElevation =
            (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
            0.55;
          rig.snap(position, yaw, pitch);
          expect(props.collide(eye.clone(), 0.3, new Vector3())).toBe(false);
          rig.camera.updateMatrixWorld(true);
          const projected = target.clone().project(rig.camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.1);
          expect(Math.abs(projected.y)).toBeLessThan(0.1);
          expect(projected.z).toBeGreaterThan(-1);
          expect(projected.z).toBeLessThan(1);
        }
      }
    } finally {
      terrain.dispose();
    }
  },
);

// Regression guard: candidate captures must not conceal an embedded hull or
// crop it while moving the hood into the upper part of either viewport.
test.each(['low', 'medium', 'high'] as const)(
  'Blue Hole %s: saved hood candidates keep the full hull and chase arm clear',
  async (tier) => {
    const { config, terrain, props } = await scene('great-blue-hole', tier);
    const sub = new SubMesh({ length: 26, hullClass: 'B', tier });
    sub.setView('chase');
    try {
      const hero = props.placed.find((p) => p.def.id === 'karst-grotto-east')!;
      const target = hero.root.localToWorld(new Vector3().fromArray(blueHolePoses.east.target));
      for (const tuning of blueHolePoses.hoodCandidates) {
        const bearing = (tuning.bearing * Math.PI) / 180;
        const position = target
          .clone()
          .add(new Vector3(Math.sin(bearing) * tuning.range, 0, -Math.cos(bearing) * tuning.range));
        position.y = hero.root.position.y + tuning.altitude;
        const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
        sub.setPose(position, yaw, 0, 0);
        sub.group.updateMatrixWorld(true);
        const vertices: Vector3[] = [];
        const bounds = new Box3();
        visitHullVertices(sub.vehicle.root, (point) => {
          vertices.push(point.clone());
          bounds.expandByPoint(point);
          expect(point.y - terrain.sampleHeight(point.x, point.z), tuning.id).toBeGreaterThan(0.8);
        });
        const sphere = bounds.getBoundingSphere(new Sphere());
        // A clear enclosing sphere protects every hull face, as well as its vertices.
        expect(
          props.collide(sphere.center.clone(), sphere.radius + 0.1, new Vector3()),
          tuning.id,
        ).toBe(false);
        expect(
          props.collide(position.clone(), config.submarine.hullRadius + 4, new Vector3()),
          tuning.id,
        ).toBe(false);
        for (const aspect of [1600 / 900, 390 / 844]) {
          const rig = new CameraRig(config.camera, aspect, terrain);
          rig.setChaseRadiusDefault(tuning.radius, tuning.offsetX, tuning.offsetY);
          rig.snap(position, yaw, 0);
          rig.camera.updateMatrixWorld(true);
          for (const point of vertices) {
            const ndc = point.clone().project(rig.camera);
            expect(Math.abs(ndc.x), `${tuning.id} horizontal hull`).toBeLessThan(1);
            expect(Math.abs(ndc.y), `${tuning.id} vertical hull`).toBeLessThan(1);
            expect(Math.abs(ndc.z), `${tuning.id} near/far hull`).toBeLessThan(1);
          }
          for (let step = 0; step <= 128; step++) {
            const point = position.clone().lerp(rig.camera.position, step / 128);
            expect(props.collide(point.clone(), 6, new Vector3()), `${tuning.id} arm`).toBe(false);
            expect(point.y - terrain.sampleHeight(point.x, point.z)).toBeGreaterThanOrEqual(
              config.camera.terrainClearance - 1e-6,
            );
          }
        }
      }
    } finally {
      sub.dispose();
      props.dispose();
      terrain.dispose();
    }
  },
);

// Regression guard: validate real candidate geometry independently of the rasterizer's matrices.
test('Blue Hole saved hood pose B agrees with pinhole rays on both actual viewports', async () => {
  const { config, terrain, props } = await scene('great-blue-hole', 'high');
  const sub = new SubMesh({ length: 26, hullClass: 'B', tier: 'high' });
  sub.setView('chase');
  try {
    const authored = blueHolePoses;
    const tuning = authored.hoodCandidates.find((pose) => pose.id === 'B')!;

    const hero = props.placed.find((prop) => prop.def.id === 'karst-grotto-east')!;
    hero.root.updateMatrixWorld(true);
    const target = hero.root.localToWorld(new Vector3(...authored.east.target));
    const bearing = (tuning.bearing * Math.PI) / 180;
    const position = target
      .clone()
      .add(new Vector3(Math.sin(bearing) * tuning.range, 0, -Math.cos(bearing) * tuning.range));
    position.y = hero.root.position.y + tuning.altitude;
    const yaw = Math.atan2(target.x - position.x, -(target.z - position.z));
    sub.setPose(position, yaw, 0, 0);
    const hood = ['grotto-overhang', 'stalactite-gallery'].map(
      (name) => hero.root.getObjectByName(name) as Mesh,
    );
    const ray = new Raycaster();
    for (const [width, height] of [
      [1600, 900],
      [390, 844],
    ]) {
      const rig = new CameraRig(config.camera, width / height, terrain);
      rig.setChaseRadiusDefault(tuning.radius, tuning.offsetX, tuning.offsetY);
      rig.snap(position, yaw, 0);
      rig.camera.updateMatrixWorld(true);
      terrain.update(rig.camera);
      const ground = solidMeshes(terrain.group);
      const scenery = [
        ...props.placed.flatMap((prop) => solidMeshes(prop.full)),
        ...solidMeshes(sub.vehicle.root),
      ];
      const solids = [...ground, ...scenery];
      const projected = projectCoverage(
        rig.camera,
        width,
        height,
        hood.map((mesh) => ({ mesh, label: 1 })),
      );
      const visible = projectCoverage(
        rig.camera,
        width,
        height,
        solids.map((mesh) => ({ mesh, label: hood.includes(mesh) ? 1 : 2 })),
      );
      // Cache exact triangle batches after terrain.update selects this layout's LOD.
      // Keep every ray and assertion; only reject batches whose bounds the ray misses.
      const intersections = solids.map(partitionedRaycast);
      // Construct pinhole rays from an orthonormal basis and FOV, without
      // projection/inverse matrices or Raycaster.setFromCamera. Query the real
      // triangles at exact pixel centres used by the rasterizer, including
      // off-subject pixels, terrain occlusion and the upper-third boundary.
      const forward = rig.camera.getWorldDirection(new Vector3());
      const right = forward
        .clone()
        .cross(new Vector3(0, 1, 0))
        .normalize();
      const up = right.clone().cross(forward).normalize();
      const tanY = Math.tan((rig.camera.fov * Math.PI) / 360);
      let projectedHits = 0,
        visibleHits = 0,
        occludedHits = 0;
      for (let row = 0; row < 24; row++)
        for (let column = 0; column < 40; column++) {
          const x = Math.floor(((column + 0.5) * width) / 40);
          const y = Math.floor(((row + 0.5) * height) / 24);
          const direction = forward
            .clone()
            .addScaledVector(right, ((2 * (x + 0.5)) / width - 1) * tanY * (width / height))
            .addScaledVector(up, (1 - (2 * (y + 0.5)) / height) * tanY)
            .normalize();
          ray.set(rig.camera.position, direction);
          // Near/far planes bound forward depth, not distance along oblique rays.
          ray.near = rig.camera.near / direction.dot(forward);
          ray.far = rig.camera.far / direction.dot(forward);
          const hits = intersections
            .flatMap((intersect) => intersect(ray))
            .sort((a, b) => a.distance - b.distance);
          // Keep all intersections so hood behind terrain still counts as projected.
          const hitsHood = hits.some((hit) => hood.includes(hit.object as Mesh));
          const hit = hits[0];
          const label = hit ? (hood.some((mesh) => mesh === hit.object) ? 1 : 2) : 0;
          const pixel = y * width + x;
          const message = `${width}×${height} pixel ${x},${y}`;
          expect(projected.labels[pixel], message).toBe(hitsHood ? 1 : 0);
          expect(visible.labels[pixel], message).toBe(label);
          projectedHits += Number(hitsHood);
          visibleHits += Number(label === 1);
          occludedHits += Number(hitsHood && label !== 1);
        }
      expect(projectedHits).toBeGreaterThan(visibleHits);
      expect(visibleHits).toBeGreaterThan(0);
      expect(occludedHits).toBeGreaterThan(0);
    }
  } finally {
    sub.dispose();
    props.dispose();
    terrain.dispose();
  }
});
