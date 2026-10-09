// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box2, InstancedMesh, Matrix4, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { BEEBE_CHIMNEY } from '../../src/core/config/beebeChimney.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { SubMesh } from '../../src/sub/SubMesh.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';

const config = makeConfig();
const meta = JSON.parse(readFileSync('data/tiles/beebe-vent-field/meta.json', 'utf8')) as TileMeta;
const bytes = readFileSync('data/tiles/beebe-vent-field/heightmap.bin');
const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
const content = JSON.parse(readFileSync('data/landmarks/beebe-vent-field/props.json', 'utf8'));

// Project the solid hull's vertices; include the arms and thrusters, exclude wash particles.
function hullScreen(sub: SubMesh, rig: CameraRig): Box2 {
  const box = new Box2();
  sub.vehicle.root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const p = mesh.geometry.getAttribute('position');
    const instances = mesh as InstancedMesh;
    for (
      let instance = 0;
      instance < (instances.isInstancedMesh ? instances.count : 1);
      instance++
    ) {
      const transform = new Matrix4();
      if (instances.isInstancedMesh) instances.getMatrixAt(instance, transform);
      transform.premultiply(mesh.matrixWorld);
      for (let i = 0; i < p.count; i++) {
        const point = new Vector3()
          .fromBufferAttribute(p, i)
          .applyMatrix4(transform)
          .project(rig.camera);
        box.expandByPoint(new Vector2(point.x, point.y));
      }
    }
  });
  return box;
}

describe('Beebe opening keeps its active main stack beside the hull', () => {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${tier}: desktop and portrait show the full hull, chimney, plume axis and nearby bed`, async () => {
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      const sub = new SubMesh({ length: 26, hullClass: 'C', tier });
      try {
        await props.placeAll(content, 'beebe-vent-field');
        const pose = composedFreeDiveSpawn(
          'beebe-vent-field',
          meta,
          terrain,
          props,
          spawnSettings(config),
          -11000,
        )!;
        expect(pose).not.toBeNull();
        const pos = new Vector3(pose.x, pose.y, pose.z);
        expect(props.collide(pos.clone(), config.submarine.hullRadius, new Vector3())).toBe(false);
        sub.setPose(pos, pose.yaw, 0, 0);
        sub.group.updateMatrixWorld(true);
        const hero = props.placed.find((p) => p.def.id === 'beebe-chimney-1')!;
        // Match the existing browser guard: keep the forward heading within its facing threshold.
        const toHero = hero.root
          .localToWorld(hero.localBounds.getCenter(new Vector3()))
          .sub(pos)
          .setY(0)
          .normalize();
        expect(new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)).dot(toHero)).toBeGreaterThan(
          0.98,
        );
        const top = Number(hero.full.userData.ventTop);
        const rig = new CameraRig(config.camera, 16 / 9, terrain);
        rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
        rig.snap(pos, pose.yaw, 0);
        // Verify the composed chase opening and the exact 40 m first-person golden pose.
        const body = hero.full.getObjectByName('smoker-body') as Mesh;
        const collars = hero.full.getObjectByName('beebe-side-collars') as Mesh;
        const orifices = hero.full.getObjectByName('beebe-orifices') as Mesh;
        const sideMouths = orifices.userData.sideMouths as Array<{
          centre: [number, number, number];
          normal: [number, number, number];
        }>;
        expect(sideMouths).toHaveLength(3);
        hero.root.updateMatrixWorld(true);
        rig.camera.updateMatrixWorld(true);
        const visibleMouths = (camera: CameraRig['camera']): number =>
          sideMouths.filter(({ centre, normal }) => {
            const point = hero.root.localToWorld(new Vector3(...centre));
            const facing = new Vector3(...normal).transformDirection(hero.root.matrixWorld);
            const toEye = camera.position.clone().sub(point);
            if (facing.dot(toEye.clone().normalize()) <= 0.1) return false;
            const screen = point.clone().project(camera);
            if (Math.abs(screen.x) > 0.9 || Math.abs(screen.y) > 0.9 || screen.z > 1) return false;
            const tangent = new Vector3().crossVectors(facing, new Vector3(0, 1, 0)).normalize();
            const a = point
              .clone()
              .addScaledVector(tangent, BEEBE_CHIMNEY.outletMouthRadiusM)
              .project(camera);
            const b = point
              .clone()
              .addScaledVector(tangent, -BEEBE_CHIMNEY.outletMouthRadiusM)
              .project(camera);
            if (Math.abs(a.x - b.x) * 800 <= 3) return false;
            const ray = new Raycaster(
              camera.position,
              point.clone().sub(camera.position).normalize(),
            );
            const hit = ray.intersectObjects([body, collars])[0];
            return !hit || hit.distance > toEye.length() - 0.08;
          }).length;
        expect(visibleMouths(rig.camera)).toBeGreaterThan(0);
        const goldenRig = new CameraRig(config.camera, 1600 / 900, terrain);
        goldenRig.setMode('first-person');
        goldenRig.lookElevation = -0.2368383507472154;
        goldenRig.snap(
          new Vector3(64.31866718801567, -4967.856059080448, -34.29482554757174),
          -2.094395102393196,
          -0.3468998753461086,
        );
        goldenRig.camera.updateMatrixWorld(true);
        if (tier === 'high') {
          expect(
            goldenRig.camera.position.distanceTo(
              new Vector3(53.367680136657945, -4968.174142090568, -27.972270225578242),
            ),
          ).toBeLessThan(0.1);
        }
        expect(visibleMouths(goldenRig.camera)).toBeGreaterThan(0);
        expect(rig.camera.position.y).toBeGreaterThanOrEqual(
          terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z) +
            config.camera.terrainClearance,
        );
        const offset = rig.camera.position.clone().sub(pos);
        const aft = new Vector3(-Math.sin(pose.yaw), 0, Math.cos(pose.yaw));
        const horizontal = offset.clone().setY(0).normalize();
        const angle = (Math.acos(horizontal.dot(aft)) * 180) / Math.PI;
        expect(angle).toBeGreaterThan(25);
        expect(angle).toBeLessThan(45);
        const elevation = (Math.atan2(offset.y, Math.hypot(offset.x, offset.z)) * 180) / Math.PI;
        expect(elevation).toBeGreaterThan(8);
        expect(elevation).toBeLessThan(22);
        for (const aspect of [1600 / 900, 390 / 844]) {
          rig.setAspect(aspect);
          rig.camera.updateMatrixWorld(true);
          const hull = hullScreen(sub, rig);
          const bow = sub.group.localToWorld(new Vector3(0, 0, -10)).project(rig.camera);
          const stern = sub.group.localToWorld(new Vector3(0, 0, 10)).project(rig.camera);
          // Judge the longitudinal axis in pixels: portrait NDC stretches X and Y differently.
          const dx = (bow.x - stern.x) * aspect;
          const dy = bow.y - stern.y;
          expect(Math.abs(dy / dx)).toBeLessThan(0.55);
          const orifice = hero.root.localToWorld(new Vector3(0, top, 0)).project(rig.camera);
          expect(orifice.x).toBeLessThan(-0.1);
          for (const edge of [hull.min, hull.max]) {
            expect(Math.abs(edge.x)).toBeLessThan(0.95);
            expect(Math.abs(edge.y)).toBeLessThan(0.95);
          }
          // The primary vent axis includes its smoking orifice and rising 34 m plume.
          for (let height = 3; height <= top + 34; height += 2) {
            const point = hero.root.localToWorld(new Vector3(0, height, 0));
            const screen = point.clone().project(rig.camera);
            expect(Math.abs(screen.x)).toBeLessThan(0.9);
            expect(Math.abs(screen.y)).toBeLessThan(0.9);
            expect(screen.z).toBeGreaterThan(-1);
            expect(screen.z).toBeLessThan(1);
            expect(screen.x).toBeLessThan(hull.min.x - 0.03);
            const ray = new Raycaster(
              rig.camera.position,
              point.clone().sub(rig.camera.position).normalize(),
            );
            ray.camera = rig.camera;
            const boatHit = ray
              .intersectObject(sub.vehicle.root, true)
              .find((hit) => (hit.object as Mesh).isMesh);
            expect(!boatHit || boatHit.distance > rig.camera.position.distanceTo(point)).toBe(true);
          }
          const floor = hero.root.localToWorld(new Vector3(0, 0, 0));
          floor.y = terrain.sampleHeight(floor.x, floor.z);
          const screen = floor.project(rig.camera);
          expect(Math.abs(screen.x)).toBeLessThan(0.9);
          expect(Math.abs(screen.y)).toBeLessThan(0.9);
          console.log(
            `BEEBE ${tier} aspect=${aspect.toFixed(3)} hull=${JSON.stringify([hull.min.toArray(), hull.max.toArray()])} bed=${JSON.stringify(screen.toArray())}`,
          );
        }
      } finally {
        sub.dispose();
        terrain.dispose();
      }
    });
  }
});
