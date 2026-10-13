// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { InstancedMesh, Line3, Matrix4, Sphere, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeConfig, type GraphicsTier } from '../../src/core/Config.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { SubmarineState } from '../../src/sub/Submarine.js';
import { Sonar } from '../../src/ui/Sonar.js';
import type { TileMeta } from '../../src/util/types.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { recordSonarCanvas } from './helpers/sonarCanvas.js';

afterEach(() => vi.unstubAllGlobals());

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

async function scene(site: string, tier: GraphicsTier) {
  vi.unstubAllGlobals();
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
  expect(props.stats.failed).toBe(0);
  const pose = composedFreeDiveSpawn(site, meta, terrain, props, spawnSettings(config), -6500)!;
  expect(pose).not.toBeNull();
  props.group.updateMatrixWorld(true);
  return { config, meta, terrain, props, pose };
}

describe('1380 merged Monterey rubble verification', () => {
  for (const tier of ['medium', 'high', 'ultra'] as const) {
    it(`${tier}: varied rubble stays in both opening frames and clears the spawn corridor`, async () => {
      const { config, terrain, props, pose } = await scene('monterey-canyon', tier);
      try {
        const position = new Vector3(pose.x, pose.y, pose.z);
        const forward = new Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
        // The authored opening is 34 m outside the wall footprint. Reserve a
        // hull-radius capsule along that first straight approach, at spawn depth.
        const approach = new Line3(position, position.clone().addScaledVector(forward, 34));
        const rocks: Array<{ sphere: Sphere; hero: boolean }> = [];
        const matrix = new Matrix4();
        const world = new Matrix4();
        for (const prop of props.placed) {
          prop.full.traverse((object) => {
            if (!(object instanceof InstancedMesh) || !object.name.startsWith('boulders-')) return;
            object.geometry.computeBoundingSphere();
            for (let i = 0; i < object.count; i++) {
              object.getMatrixAt(i, matrix);
              world.multiplyMatrices(object.matrixWorld, matrix);
              rocks.push({
                sphere: object.geometry.boundingSphere!.clone().applyMatrix4(world),
                hero: prop.def.id === 'canyon-wall-ledge',
              });
            }
          });
        }
        expect(rocks.length).toBeGreaterThan(100);
        const approachClearance = Math.min(
          ...rocks.map(
            ({ sphere }) =>
              approach
                .closestPointToPoint(sphere.center, true, new Vector3())
                .distanceTo(sphere.center) -
              sphere.radius -
              config.submarine.hullRadius,
          ),
        );
        // Bounding spheres enclose the actual fractured geometry, so a positive
        // clearance proves no rock intersects this swept submarine volume.
        expect(approachClearance).toBeGreaterThan(0);
        for (const [width, height] of [
          [1280, 800],
          [844, 390],
        ]) {
          const rig = new CameraRig(config.camera, width! / height!, terrain);
          rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
          rig.snap(position, pose.yaw, 0);
          const chase = new Line3(position, rig.camera.position);
          for (const { sphere } of rocks)
            expect(
              chase
                .closestPointToPoint(sphere.center, true, new Vector3())
                .distanceTo(sphere.center) - sphere.radius,
            ).toBeGreaterThan(6);
          const inFrame = rocks.filter(({ sphere, hero }) => {
            const p = sphere.center.clone().project(rig.camera);
            return hero && Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1;
          });
          expect(inFrame.length).toBeGreaterThan(20);
          const sizes = inFrame.map(({ sphere }) => sphere.radius);
          expect(Math.max(...sizes) / Math.min(...sizes)).toBeGreaterThan(4);
          const local = inFrame.map(({ sphere }) =>
            props.placed
              .find((p) => p.def.id === 'canyon-wall-ledge')!
              .root.worldToLocal(sphere.center.clone()),
          );
          // Both axes must have meaningful spread: a single wall-foot row fails.
          for (const [axis, span] of [
            ['x', 40],
            ['z', 10],
          ] as const)
            expect(
              Math.max(...local.map((p) => p[axis])) - Math.min(...local.map((p) => p[axis])),
            ).toBeGreaterThan(span);
        }
      } finally {
        terrain.dispose();
      }
    });
  }
});

describe('1380 merged Endurance minimap verification', () => {
  for (const tier of ['low', 'high'] as const) {
    for (const dpr of [1, 2]) {
      it(`${tier}, DPR ${dpr}: full update draws the hull ring and plan over localized scour`, async () => {
        const { config, meta, terrain, props, pose } = await scene('endurance', tier);
        try {
          const recorded = recordSonarCanvas();
          vi.stubGlobal('document', recorded.document);
          vi.stubGlobal('devicePixelRatio', dpr);
          const sonar = new Sonar(terrain);
          const ctx = sonar.canvas.getContext('2d')!;
          ctx.setLineDash = vi.fn();
          ctx.strokeRect = vi.fn();
          ctx.createRadialGradient = vi.fn(
            () => ({ addColorStop: vi.fn() }) as unknown as CanvasGradient,
          );
          const arc = vi.spyOn(ctx, 'arc');
          const translate = vi.spyOn(ctx, 'translate');
          const pois = placePois(
            parsePois(json('data/landmarks/endurance/pois.json')),
            meta,
            terrain,
            config.scan,
            'endurance',
          );
          sonar.setPois(pois);
          // Supply the same placed hull footprint that the app's props-loaded
          // listener supplies, including its actual world position and scale.
          sonar.setFootprints(
            props.placed.flatMap(({ def, root }) =>
              def.procedural === 'hull-block' && def.dimensionsM
                ? [
                    {
                      x: root.position.x,
                      z: root.position.z,
                      lengthM: def.dimensionsM[0] * def.scale[2],
                      widthM: def.dimensionsM[1] * def.scale[0],
                      headingDeg: def.headingDeg,
                    },
                  ]
                : [],
            ),
          );
          sonar.update({
            position: new Vector3(pose.x, pose.y, pose.z),
            headingDeg: 0,
          } as SubmarineState);
          const marker = sonar.markers.find((m) => m.poiId === 'endurance-hull')!;
          expect(marker.visible).toBe(true);
          expect(arc).toHaveBeenCalledWith(marker.px, marker.py, 5, 0, Math.PI * 2);
          expect(translate).toHaveBeenCalledWith(marker.px, marker.py);
          const hull = recorded.paths.find((path) => path.width === 1.2)!;
          expect(hull.points).toHaveLength(7);
          expect(
            Math.max(...hull.points.map((p) => p[1]!)) - Math.min(...hull.points.map((p) => p[1]!)),
          ).toBeGreaterThanOrEqual(24);
          const contours = recorded.paths.filter(
            (path) => path.points.length > 1 && path.style.startsWith('rgba(225,244,220,'),
          );
          expect(contours.length).toBeGreaterThan(1);
          for (const path of contours) {
            for (const axis of [0, 1]) {
              const coords = path.points.map((p) => p[axis]!);
              expect(Math.max(...coords) - Math.min(...coords)).toBeLessThan(220 * 0.55);
            }
          }
          expect(recorded.rasters).toHaveLength(1);
        } finally {
          vi.unstubAllGlobals();
          terrain.dispose();
        }
      });
    }
  }
});
