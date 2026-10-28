// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { composedFreeDiveSpawn as framedSpawn } from '../../src/game/DeepOpeningSpawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import type { TileMeta } from '../../src/util/types.js';
import { siteManifest } from '../../src/core/SiteManifest.js';
import { solidMeshes, subjectVisibility } from './helpers/subjectVisibility.js';

const heroes: Record<string, string> = {
  titanic: 'bow-hull',
  'challenger-deep': 'leggo-lander-marker',
  'lost-city': 'poseidon-tower',
  'monterey-canyon': 'canyon-wall-ledge',
  endurance: 'main-hull',
  'axial-seamount-ashes': 'mushroom-chimney',
  'hudson-canyon': 'coral-ledge-mound',
  kamaehuakanaloa: siteManifest('kamaehuakanaloa')!.opening!.freeDive!.hero,
  'beebe-vent-field': 'beebe-chimney-1',
  'great-blue-hole': 'karst-grotto',
  bismarck: 'main-hull',
  'hunga-tonga-caldera': 'caldera-tuff-wall',
  'blake-plateau-corals': 'lophelia-mound',
};

describe('free-dive openings on actual survey terrain and procedural hero geometry', () => {
  for (const [site, heroId] of Object.entries(heroes)) {
    it(`${site}: faces a visible hero with hull and camera clearance`, async () => {
      const config = makeConfig();
      const meta = JSON.parse(readFileSync(`data/tiles/${site}/meta.json`, 'utf8')) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, 'low');
      const props = new Props(meta, terrain, config.props, 'medium');
      const document = JSON.parse(readFileSync(`data/landmarks/${site}/props.json`, 'utf8'));
      // External GLBs are exercised by e2e; all opening heroes are procedural.
      document.props = document.props.filter((p: { model: string }) =>
        p.model.startsWith('procedural:'),
      );
      try {
        await props.placeAll(document, site);
        expect(props.stats.failed).toBe(0);
        const spawn = composedFreeDiveSpawn(
          site,
          meta,
          terrain,
          props,
          spawnSettings(config),
          -11000,
        );
        expect(spawn).not.toBeNull();
        // Pin both passes and modes so tuning moves preserve the opening behavior.
        for (const mode of ['arcade', 'realistic', 'custom'] as const) {
          const args = [
            site,
            meta,
            terrain,
            props,
            spawnSettings(config),
            -11000,
            config.camera,
            mode,
          ] as const;
          const base = composedFreeDiveSpawn(...args);
          const framed = framedSpawn(...args);
          // Grounded openings must follow real near triangles, including when a
          // continuous survey reconstruction would give a different elevation.
          for (const pose of [base, framed]) {
            expect(pose).not.toBeNull();
            const ray = new Raycaster(new Vector3(pose!.x, 100, pose!.z), new Vector3(0, -1, 0));
            const hit = ray.intersectObjects(
              terrain.group.children.filter((o) => o instanceof Mesh),
            )[0];
            expect(hit).toBeDefined();
            expect(Math.abs(terrain.sampleHeight(pose!.x, pose!.z) - hit.point.y)).toBeLessThan(
              0.001,
            );
          }
          if (site === 'kamaehuakanaloa') {
            // Re-aiming the subject is authored art. Guard the resulting frame
            // and clearances rather than snapshotting its world coordinates.
            const authored = siteManifest(site)!.opening!;
            for (const [pose, subjectId] of [
              [base!, authored.freeDive!.hero],
              [framed!, authored.reframe?.aimHero ?? authored.freeDive!.hero],
            ] as const) {
              const position = new Vector3(pose.x, pose.y, pose.z);
              const rig = new CameraRig(config.camera, 16 / 9, terrain);
              rig.setChaseRadiusDefault(
                pose.chaseRadius,
                pose.chaseOffsetX,
                pose.chaseOffsetY,
                pose.portraitChaseOffset,
              );
              rig.snap(position, pose.yaw, 0);
              terrain.update(rig.camera);
              props.update(rig.camera);
              const subject = props.placed.find((p) => p.def.id === subjectId)!;
              expect(subject).toBeDefined();
              const body = solidMeshes(subject.root)[0];
              expect(body).toBeDefined();
              expect(
                subjectVisibility(
                  body,
                  [...solidMeshes(terrain.group), ...solidMeshes(props.group)],
                  rig.camera,
                ),
              ).toEqual([true, true]);
              expect(
                props.collide(position.clone(), config.submarine.hullRadius, new Vector3()),
              ).toBe(false);
              expect(props.collide(rig.camera.position.clone(), 1, new Vector3())).toBe(false);
              expect(
                rig.camera.position.y -
                  terrain.sampleHeight(rig.camera.position.x, rig.camera.position.z),
              ).toBeGreaterThanOrEqual(config.camera.terrainClearance - 1e-6);
            }
          } else expect({ base, framed }).toMatchSnapshot(mode);
        }
        const pos = new Vector3(spawn!.x, spawn!.y, spawn!.z);
        if (site === 'great-blue-hole')
          expect(pos.y - terrain.sampleHeight(pos.x, pos.z)).toBeGreaterThan(25);
        expect(pos.y).toBeLessThanOrEqual(-config.submarine.hullRadius);
        expect(pos.y).toBeGreaterThanOrEqual(
          terrain.sampleHeight(pos.x, pos.z) +
            config.submarine.hullRadius +
            config.submarine.seabedClearance,
        );
        expect(props.collide(pos.clone(), config.submarine.hullRadius, new Vector3())).toBe(false);
        const hero = props.placed.find((p) => p.def.id === heroId)!;
        const centre = hero.localBounds.getCenter(new Vector3());
        if (hero.def.model === 'procedural:chimney' && hero.def.dimensionsM)
          // Mirrors the opening: a sunk foundation must not lower the aim; vent sets aim lower.
          centre.y =
            Math.max(hero.localBounds.min.y, 0) +
            hero.def.dimensionsM[2] *
              (['lost-city', 'beebe-vent-field'].includes(site) ? 0.42 : 0.55);
        const target = hero.root.localToWorld(centre);
        const rig = new CameraRig(config.camera, 16 / 9, terrain);
        rig.setChaseRadiusDefault(spawn!.chaseRadius, spawn!.chaseOffsetX);
        rig.snap(pos, spawn!.yaw, 0);
        const eye = rig.camera.position;
        expect(eye.y).toBeLessThanOrEqual(-2 + 1e-8);
        expect(eye.y).toBeGreaterThanOrEqual(
          terrain.sampleHeight(eye.x, eye.z) + config.camera.terrainClearance - 1e-8,
        );
        rig.camera.updateMatrixWorld();
        const screen = target.clone().project(rig.camera);
        console.log(
          `OPENING ${site} subY=${pos.y.toFixed(1)} eyeY=${eye.y.toFixed(1)} heroScreen=${screen.x.toFixed(2)},${screen.y.toFixed(2)} yaw=${((spawn!.yaw * 180) / Math.PI).toFixed(1)}`,
        );
        expect(Math.abs(screen.x)).toBeLessThan(0.9);
        expect(Math.abs(screen.y)).toBeLessThan(0.9);
        expect(screen.z).toBeLessThan(1);
        expect(screen.z).toBeGreaterThan(-1);
      } finally {
        terrain.dispose();
      }
    });
  }
});
