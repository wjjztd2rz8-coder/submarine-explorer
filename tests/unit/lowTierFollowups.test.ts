// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { BoxGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector2, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import type { GraphicsTier } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { composedFreeDiveSpawn, composedMissionSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { parsePois, placePois, spawnPoseForPoi } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { reticleClearOfControls } from '../../src/ui/ScanReticleLayout.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import poses from '../../tools/lowtier-poses.json';
import blueHolePoses from '../../tools/blue-hole-poses.json';
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
            rig.setPhoneLandscape(width === 844);
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
    expect(cliffHits).toBeGreaterThanOrEqual(20);
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
