// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { makeConfig } from '../../src/core/Config.js';
import { EventsVisual } from '../../src/game/EventsVisual.js';
import { eventKinds } from '../../src/game/Events.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
for (const site of [
  'axial-seamount-ashes',
  'beebe-vent-field',
  'kamaehuakanaloa',
  'monterey-canyon',
  'hudson-canyon',
  'hunga-tonga-caldera',
]) {
  it(`${site}: actual Low opening supports visible events on phone and desktop`, async () => {
    const config = makeConfig();
    const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
    const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
    const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
    const terrain = new Terrain({ meta, heights }, config.terrain, 'low');
    const props = new Props(meta, terrain, config.props, 'low');
    const visual = new EventsVisual('low');
    try {
      await props.load('props.json', site, async () => json(`data/landmarks/${site}/props.json`));
      const pose = composedFreeDiveSpawn(
        site,
        meta,
        terrain,
        props,
        spawnSettings(config),
        -6000,
        config.camera,
      )!;
      expect(pose).not.toBeNull();
      for (const aspect of [844 / 390, 1280 / 720]) {
        for (const kind of eventKinds({ site, depthM: 0, altitudeM: 0 })) {
          const pilot = new THREE.Vector3(pose.x, kind === 'whale' ? -60 : pose.y, pose.z);
          const rig = new CameraRig(config.camera, aspect, terrain);
          rig.setPhoneLandscape(aspect === 844 / 390);
          rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
          rig.snap(pilot, pose.yaw, 0);
          const forward = new THREE.Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
          const event = { kind, elapsedS: 0, durationS: 18 };
          expect(
            visual.begin(event, pilot, forward, (x, z) => terrain.sampleHeight(x, z), rig.camera),
            `${kind}/${aspect}`,
          ).toBe(true);
          const centre = visual.origin.clone().project(rig.camera);
          expect(Math.abs(centre.x)).toBeLessThan(0.82);
          expect(Math.abs(centre.y)).toBeLessThan(0.82);
          // Check the rendered geometry, not just its nominated witness centre.
          visual.group.updateMatrixWorld(true);
          const object = visual.group.children[kind === 'whale' ? 1 : 0] as THREE.Mesh;
          const positions = object.geometry.getAttribute('position');
          const point = new THREE.Vector3();
          let visible = 0;
          let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
          for (let i = 0; i < positions.count; i++) {
            point
              .fromBufferAttribute(positions, i)
              .applyMatrix4(object.matrixWorld)
              .project(rig.camera);
            if (Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z > -1 && point.z < 1)
              visible++;
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          }
          expect(visible / positions.count, `${kind}/${aspect} visible geometry`).toBeGreaterThan(
            0.7,
          );
          const widthPx = ((maxX - minX) * (aspect === 844 / 390 ? 844 : 1280)) / 2;
          const heightPx = ((maxY - minY) * (aspect === 844 / 390 ? 390 : 720)) / 2;
          expect(kind === 'plume' ? heightPx : widthPx, `${kind} screen footprint`).toBeGreaterThan(
            45,
          );
          if (kind === 'whale')
            expect(heightPx, 'the crossing outline must show fins and flukes').toBeGreaterThan(8);
          const start = visual.origin.clone();
          visual.update({ ...event, elapsedS: 7 });
          if (kind === 'turbidity') expect(visual.origin.y).toBeLessThanOrEqual(start.y + 0.01);
        }
      }
    } finally {
      visual.dispose();
      terrain.dispose();
    }
  });
}
