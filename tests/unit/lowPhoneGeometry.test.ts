import * as THREE from 'three';
import { expect, test } from 'vitest';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { fidelityScene } from './fidelitySceneHelpers.js';

// Headless evidence only: these checks cannot establish brightness or HUD clearance.
for (const site of ['great-blue-hole', 'lost-city']) {
  test(`${site} Low: hero solids and golden targets survive both phone orientations`, async () => {
    const { config, terrain, props, views } = await fidelityScene(site, 'low');
    try {
      expect(props.stats.failed).toBe(0);
      const ids =
        site === 'great-blue-hole' ? ['karst-grotto', 'karst-grotto-east'] : ['poseidon-tower'];
      for (const id of ids) {
        const hero = props.placed.find((p) => p.def.id === id)!;
        expect(hero, id).toBeDefined();
        const solid =
          site === 'great-blue-hole'
            ? (hero.full.getObjectByName('stalactite-gallery') as THREE.Mesh)
            : (hero.full.children[0] as THREE.Mesh);
        const vertices = solid.geometry.getAttribute('position');
        expect(vertices.count, id).toBeGreaterThan(0);
        expect(Array.from(vertices.array).every(Number.isFinite), id).toBe(true);
        if (site === 'great-blue-hole') {
          // Sharp carves must agree with their Low mesh, not just the analytic relief.
          const ray = new THREE.Raycaster(
            hero.root.position.clone().add(new THREE.Vector3(0, 200, 0)),
            new THREE.Vector3(0, -1, 0),
          );
          terrain.group.updateMatrixWorld(true);
          const hit = ray.intersectObject(terrain.group, true)[0];
          expect(hit, id).toBeDefined();
          expect(terrain.sampleHeight(hit.point.x, hit.point.z)).toBeCloseTo(hit.point.y, 3);
        }
      }
      for (const aspect of [390 / 844, 844 / 390]) {
        for (const view of views.filter((v) => v.target)) {
          const target = view.target!;
          const rig = new CameraRig(config.camera, aspect, terrain);
          rig.setMode('first-person');
          rig.snap(view.position, view.yaw, view.pitch);
          const eye = rig.camera.position;
          rig.lookElevation =
            (Math.atan2(target.y - eye.y, Math.hypot(target.x - eye.x, target.z - eye.z)) -
              view.pitch) /
            0.55;
          rig.snap(view.position, view.yaw, view.pitch);
          rig.camera.updateMatrixWorld(true);
          const screen = target.clone().project(rig.camera);
          expect(Math.abs(screen.x), view.name).toBeLessThan(0.1);
          expect(Math.abs(screen.y), view.name).toBeLessThan(0.1);
          expect(screen.z, view.name).toBeGreaterThan(-1);
          expect(screen.z, view.name).toBeLessThan(1);
        }
      }
    } finally {
      terrain.dispose();
    }
  });
}
