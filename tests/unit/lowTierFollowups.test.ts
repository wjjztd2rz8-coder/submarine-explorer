// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { Mesh, Raycaster, Vector2, Vector3 } from 'three';
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

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
async function scene(site: string, tier: GraphicsTier = 'low') {
  const config = makeConfig();
  const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
  const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
  const terrain = new Terrain(
    { meta, heights: new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows) },
    config.terrain,
    tier,
  );
  const props = new Props(meta, terrain, config.props, tier);
  await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
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

test('Kamaehuakanaloa Low: opening and approach contain the full pillow mesh in portrait', async () => {
  const site = 'kamaehuakanaloa';
  const { config, meta, terrain, props } = await scene(site);
  try {
    const hero = props.placed.find((p) => p.def.id === 'hiolo-north-pillows')!;
    const mesh = hero.full.children[0] as Mesh;
    const opening = composedFreeDiveSpawn(
      site,
      meta,
      terrain,
      props,
      spawnSettings(config),
      -6500,
      config.camera,
    )!;
    expect(opening).not.toBeNull();
    const fixed = poses[site];
    const target = hero.root.localToWorld(hero.localBounds.getCenter(new Vector3()));
    const approach = target
      .clone()
      .addScaledVector(new Vector3().fromArray(fixed.direction), fixed.approachRange);
    approach.y = hero.root.position.y + fixed.above;
    for (const [name, position, yaw] of [
      ['opening', new Vector3(opening.x, opening.y, opening.z), opening.yaw],
      ['approach', approach, Math.atan2(target.x - approach.x, -(target.z - approach.z))],
    ] as const) {
      const rig = new CameraRig(config.camera, 390 / 844, terrain);
      let pitch = 0;
      if (name === 'opening')
        rig.setChaseRadiusDefault(
          opening.chaseRadius,
          opening.chaseOffsetX,
          opening.chaseOffsetY,
          opening.portraitChaseOffset,
        );
      else {
        pitch = Math.atan2(target.y - position.y, fixed.approachRange);
        rig.setMode('first-person');
        rig.snap(position, yaw, pitch);
        const eye = rig.camera.position;
        rig.lookElevation =
          (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) - pitch) /
          0.55;
      }
      rig.snap(position, yaw, pitch);
      rig.camera.updateMatrixWorld(true);
      const vertices = mesh.geometry.getAttribute('position');
      let maxX = 0;
      for (let i = 0; i < vertices.count; i++) {
        const p = new Vector3()
          .fromBufferAttribute(vertices, i)
          .applyMatrix4(mesh.matrixWorld)
          .project(rig.camera);
        maxX = Math.max(maxX, Math.abs(p.x));
        expect(p.z, name).toBeGreaterThan(-1);
        expect(p.z, name).toBeLessThan(1);
      }
      console.log('PILLOW', name, 'maxX', maxX, 'position', position.toArray());
      expect(maxX, name).toBeLessThan(0.88);
      expect(
        props.collide(position.clone(), config.submarine.hullRadius, new Vector3()),
        name,
      ).toBe(false);
      expect(props.collide(rig.camera.position.clone(), 1, new Vector3()), name).toBe(false);
      const scanner = new Scanner(config.scan, new EventBus());
      scanner.setTargets(
        placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          config.scan,
          site,
        ),
      );
      scanner.update(0, position, new Vector3(Math.sin(yaw), 0, -Math.cos(yaw)), false);
      expect(scanner.view.nearestDistance, name).toBeLessThanOrEqual(120);
      expect(scanner.view.candidateId, name).not.toBeNull();
    }
  } finally {
    terrain.dispose();
  }
});

for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
  test(`Kamaehuakanaloa ${tier}: pillow framing preserves the vent-facing opening for free dive and missions`, async () => {
    const site = 'kamaehuakanaloa';
    const { config, meta, terrain, props } = await scene(site, tier);
    try {
      const vent = props.placed.find((p) => p.def.id === 'hiolo-north-chimney-1')!;
      const ventCentre = vent.root.localToWorld(vent.localBounds.getCenter(new Vector3()));
      const pillows = props.placed.find((p) => p.def.id === 'hiolo-north-pillows')!;
      const mesh = pillows.full.children[0] as Mesh;
      const pois = placePois(
        parsePois(json(`data/landmarks/${site}/pois.json`)),
        meta,
        terrain,
        config.scan,
        site,
      );
      const primaries = pois.filter((p) => p.primary);
      const settings = spawnSettings(config);
      for (const pose of [
        composedFreeDiveSpawn(site, meta, terrain, props, settings, -6500, config.camera),
        composedMissionSpawn(site, primaries, meta, terrain, props, settings, -6500, config.camera),
      ]) {
        expect(pose).not.toBeNull();
        const position = new Vector3(pose!.x, pose!.y, pose!.z);
        const forward = new Vector3(Math.sin(pose!.yaw), 0, -Math.cos(pose!.yaw));
        const facing = forward.dot(ventCentre.clone().sub(position).setY(0).normalize());
        expect(facing).toBeGreaterThan(0.98);
        expect(props.collide(position.clone(), config.submarine.hullRadius, new Vector3())).toBe(
          false,
        );
        for (const aspect of [390 / 844, 1280 / 720]) {
          const rig = new CameraRig(config.camera, aspect, terrain);
          rig.setChaseRadiusDefault(
            pose!.chaseRadius,
            pose!.chaseOffsetX,
            pose!.chaseOffsetY,
            pose!.portraitChaseOffset,
          );
          rig.snap(position, pose!.yaw, 0);
          rig.camera.updateMatrixWorld(true);
          const vertices = mesh.geometry.getAttribute('position');
          let maxX = 0;
          for (let i = 0; i < vertices.count; i++) {
            const point = new Vector3()
              .fromBufferAttribute(vertices, i)
              .applyMatrix4(mesh.matrixWorld)
              .project(rig.camera);
            maxX = Math.max(maxX, Math.abs(point.x));
            expect(point.z).toBeGreaterThan(-1);
            expect(point.z).toBeLessThan(1);
          }
          expect(maxX).toBeLessThan(0.88);
          expect(props.collide(rig.camera.position.clone(), 1, new Vector3())).toBe(false);
        }
      }
    } finally {
      terrain.dispose();
    }
  });
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
    const pois = placePois(
      parsePois(json(`data/landmarks/${site}/pois.json`)),
      meta,
      terrain,
      config.scan,
      site,
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
