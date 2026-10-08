// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import type { GraphicsTier } from '../../src/core/config/quality.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Terrain } from '../../src/world/Terrain.js';
import { Props } from '../../src/world/Props.js';
import type { TileMeta } from '../../src/util/types.js';

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/** Real data and the same pose recipe as tools/golden-shots.mjs; no renderer census. */
export async function fidelityScene(site: string, tier: GraphicsTier, enabled = true) {
  const config = makeConfig();
  config.terrain.fidelity = { ...config.terrain.fidelity };
  if (!enabled) delete config.terrain.fidelity?.[site];
  const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
  const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
  const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
  const terrain = new Terrain({ meta, heights }, config.terrain, tier);
  const props = new Props(meta, terrain, config.props, tier);
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
  if (!pose || props.stats.failed) throw new Error(`Incomplete scene: ${site}/${tier}`);
  const pois = placePois(
    parsePois(json(`data/landmarks/${site}/pois.json`)),
    meta,
    terrain,
    config.scan,
    site,
  );
  const views: Array<{
    name: string;
    position: THREE.Vector3;
    yaw: number;
    pitch: number;
    target?: THREE.Vector3;
  }> = [
    {
      name: 'opening',
      position: new THREE.Vector3(pose.x, pose.y, pose.z),
      yaw: pose.yaw,
      pitch: 0,
    },
  ];
  const heroes =
    site === 'great-blue-hole' ? ['karst-grotto', 'karst-grotto-east'] : ['poseidon-tower'];
  for (const id of heroes) {
    const hero = props.placed.find((p) => p.def.id === id)!;
    hero.root.updateMatrixWorld(true);
    let target: THREE.Vector3;
    let direction: THREE.Vector3;
    if (site === 'great-blue-hole') {
      target = hero.root.localToWorld(
        id === 'karst-grotto-east'
          ? new THREE.Vector3(0, 6.2, -9)
          : hero.localBounds.getCenter(new THREE.Vector3()),
      );
      direction =
        id === 'karst-grotto-east'
          ? new THREE.Vector3(-0.544639035, 0, -0.838670568)
          : new THREE.Vector3(1, 0, 0);
    } else {
      const centre = hero.localBounds.getCenter(new THREE.Vector3());
      centre.y = Math.max(hero.localBounds.min.y, 0) + hero.def.dimensionsM![2] * 0.45;
      target = hero.root.localToWorld(centre);
      let clear = false;
      direction = new THREE.Vector3();
      for (let i = 0; i < 16; i++) {
        const angle = Math.PI / 4 + (i * Math.PI) / 8;
        direction
          .copy(hero.root.localToWorld(new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle))))
          .sub(hero.root.localToWorld(new THREE.Vector3()))
          .setY(0)
          .normalize();
        clear = [40, 30].every((range) => {
          const p = target.clone().addScaledVector(direction, range);
          p.y = terrain.sampleHeight(p.x, p.z) + 15;
          return (
            p.y < -config.submarine.hullRadius &&
            !props.collide(p.clone(), config.submarine.hullRadius, new THREE.Vector3())
          );
        });
        if (clear) break;
      }
      if (!clear) throw new Error('No clear Lost City golden approach');
    }
    for (const shot of [2, 3]) {
      const east = id === 'karst-grotto-east';
      const range =
        site === 'lost-city'
          ? shot === 2
            ? 40
            : 30
          : east
            ? shot === 2
              ? 55
              : 42
            : shot === 2
              ? 40
              : 36;
      const side = shot === 3 && site === 'great-blue-hole' ? (east ? 8 : 10) : 0;
      const position = target
        .clone()
        .addScaledVector(direction, range)
        .add(new THREE.Vector3(-direction.z * side, 0, direction.x * side));
      position.y =
        site === 'lost-city'
          ? terrain.sampleHeight(position.x, position.z) + 15
          : hero.root.position.y + (shot === 2 ? 5 : east ? 6.5 : 9);
      views.push({
        name: `${id}-${shot}`,
        position,
        target,
        yaw: Math.atan2(target.x - position.x, -(target.z - position.z)),
        pitch: THREE.MathUtils.clamp(
          Math.atan2(target.y - position.y, range),
          -config.submarine.maxPitch,
          config.submarine.maxPitch,
        ),
      });
    }
  }
  const counts = [];
  for (const aspect of [1600 / 900, 390 / 844]) {
    for (const view of views) {
      for (const drift of [-2, 0, 2]) {
        const position = view.position.clone();
        position.y += drift;
        const rig = new CameraRig(config.camera, aspect, terrain);
        if (view.target) {
          rig.setMode('first-person');
          rig.snap(position, view.yaw, view.pitch);
          const eye = rig.camera.position;
          rig.lookElevation =
            (Math.atan2(
              view.target.y - eye.y,
              Math.hypot(view.target.x - eye.x, view.target.z - eye.z),
            ) -
              view.pitch) /
            0.55;
        } else rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
        rig.snap(position, view.yaw, view.pitch);
        terrain.update(rig.camera);
        props.update(rig.camera);
        const frustum = new THREE.Frustum().setFromProjectionMatrix(
          new THREE.Matrix4().multiplyMatrices(
            rig.camera.projectionMatrix,
            rig.camera.matrixWorldInverse,
          ),
        );
        let propTriangles = 0;
        props.group.updateMatrixWorld(true);
        props.group.traverseVisible((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh || (mesh.frustumCulled && !frustum.intersectsObject(mesh))) return;
          propTriangles +=
            ((mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3) *
            ((mesh as THREE.InstancedMesh).isInstancedMesh
              ? (mesh as THREE.InstancedMesh).count
              : 1);
        });
        counts.push({
          name: view.name,
          aspect,
          drift,
          terrainTriangles: terrain.stats.drawnTriangles,
          propTriangles,
          triangles: terrain.stats.drawnTriangles + propTriangles,
          camera: rig.camera.position.toArray(),
        });
      }
    }
  }
  // Restore near geometry before independent mesh/collision comparisons.
  for (const chunk of (terrain as unknown as { chunks: Array<{ setLod(n: number): void }> }).chunks)
    chunk.setLod(0);
  terrain.group.updateMatrixWorld(true);
  return { config, meta, terrain, props, pose, pois, views, counts };
}
