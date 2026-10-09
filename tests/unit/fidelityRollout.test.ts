import * as THREE from 'three';
import { expect, it } from 'vitest';
import { fidelityScene } from './fidelitySceneHelpers.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TerrainChunk } from '../../src/world/TerrainChunk.js';

for (const site of ['great-blue-hole', 'lost-city']) {
  for (const tier of ['medium', 'high', 'ultra'] as const) {
    it(`${site} ${tier}: dense opening, golden collision parity, seats and consistent seams/LODs`, async () => {
      const s = await fidelityScene(site, tier);
      // The frozen west close golden already intersects a gallery proxy on the
      // baseline. Compare every Blue Hole station so new terrain cannot add collisions.
      const baseline = site === 'great-blue-hole' ? await fidelityScene(site, tier, false) : null;
      const { terrain, config, meta, props } = s;
      try {
        const profile = config.terrain.fidelity![site]!;
        const focus = latLonToWorld(meta, profile.focus.lat, profile.focus.lon);
        expect(terrain.stats.vertices).toBeLessThanOrEqual(config.terrain.maxVertices);
        expect(terrain.stats.subdivisionCounts![profile.nearSubdiv[tier]]).toBeGreaterThan(0);
        for (const position of [s.views[0]!.position, s.pois[0]!.position]) {
          expect(Math.hypot(position.x - focus.x, position.z - focus.z)).toBeLessThan(
            profile.focus.radiusM,
          );
        }
        if (tier === 'medium') {
          for (const count of s.counts) {
            // Same strict ceiling/reserve as 810, over all golden poses and ±2 m drift.
            // Sub, swimming life, scatter and effects are not in this CPU census.
            expect(
              count.triangles + 200_000,
              `${count.name}, aspect ${count.aspect}, drift ${count.drift}`,
            ).toBeLessThan(900_000);
          }
        }
        const ray = new THREE.Raycaster();
        for (const view of s.views) {
          expect(
            view.position.y - terrain.sampleHeight(view.position.x, view.position.z),
            view.name,
          ).toBeGreaterThan(config.submarine.hullRadius);
          const previous = baseline?.views.find((v) => v.name === view.name);
          const collidedBefore =
            previous && baseline
              ? baseline.props.collide(
                  previous.position.clone(),
                  config.submarine.hullRadius,
                  new THREE.Vector3(),
                )
              : false;
          expect(
            props.collide(view.position.clone(), config.submarine.hullRadius, new THREE.Vector3()),
            view.name,
          ).toBe(collidedBefore);
        }
        // Independent rays check snapped props and POIs as well as all authored golden stations.
        for (const p of [
          ...s.views.map((v) => v.position),
          ...props.placed.map((p) => p.root.position),
          ...s.pois.map((p) => p.position),
        ]) {
          ray.set(new THREE.Vector3(p.x, 100, p.z), new THREE.Vector3(0, -1, 0));
          const hit = ray.intersectObject(terrain.group, true)[0];
          expect(hit).toBeDefined();
          expect(Math.abs(terrain.sampleHeight(p.x, p.z) - hit.point.y)).toBeLessThan(0.001);
        }
        const chunks = (terrain as unknown as { chunks: TerrainChunk[] }).chunks;
        const edges = new Map<string, { y: number; normal: THREE.Vector3; cavity: number }>();
        let shared = 0;
        for (const chunk of chunks) {
          const p = chunk.geometry.getAttribute('position');
          const n = chunk.geometry.getAttribute('normal');
          const cavity = chunk.geometry.getAttribute('aCavity');
          // Surface vertices are row-major, then the four skirt runs follow.
          let nx = 1;
          while (nx < p.count && p.getZ(nx) === p.getZ(0)) nx++;
          const nz = (p.count - 2 * nx) / (nx + 2);
          expect(Number.isInteger(nz)).toBe(true);
          for (let row = 0; row < nz; row++)
            for (let col = 0; col < nx; col++) {
              if (row !== 0 && row !== nz - 1 && col !== 0 && col !== nx - 1) continue;
              const i = row * nx + col;
              const key = `${p.getX(i).toFixed(3)}|${p.getZ(i).toFixed(3)}`;
              const normal = new THREE.Vector3().fromBufferAttribute(n, i);
              const prev = edges.get(key);
              if (prev) {
                shared++;
                expect(p.getY(i)).toBeCloseTo(prev.y, 4);
                expect(normal.distanceTo(prev.normal)).toBeLessThan(1e-5);
                expect(cavity.getX(i)).toBe(prev.cavity);
              } else edges.set(key, { y: p.getY(i), normal, cavity: cavity.getX(i) });
            }
          // Every skirt bottom remains below its matching top by the configured depth.
          let k = nx * nz;
          const top = [
            ...Array.from({ length: nx }, (_, i) => i),
            ...Array.from({ length: nx }, (_, i) => (nz - 1) * nx + i),
            ...Array.from({ length: nz }, (_, i) => i * nx),
            ...Array.from({ length: nz }, (_, i) => i * nx + nx - 1),
          ];
          for (const i of top)
            expect(p.getY(i) - p.getY(k++)).toBeCloseTo(config.terrain.skirtDepthM, 3);
          for (const lod of [0, 1, 2]) {
            chunk.setLod(lod);
            const indices = chunk.geometry.getIndex()!.array;
            expect(indices.every((i) => Number.isInteger(i) && i >= 0 && i < p.count)).toBe(true);
          }
          chunk.setLod(0);
        }
        expect(shared).toBeGreaterThan(1000);
      } finally {
        terrain.dispose();
        baseline?.terrain.dispose();
      }
    }, 60_000);
  }

  it(`${site} Low: reconstructed bowl resolves locally; other profiles retain identical buffers`, async () => {
    const a = await fidelityScene(site, 'low');
    const b = await fidelityScene(site, 'low', false);
    try {
      if (site === 'great-blue-hole') {
        expect(a.terrain.stats.vertices).toBeLessThan(500_000);
        expect(a.terrain.stats.subdiv).toBe(b.terrain.stats.subdiv);
        expect(a.terrain.stats.subdivisionCounts![16]).toBeGreaterThan(0);
        for (const count of a.counts) {
          // Reserve the same 200k for swimming life, scatter and the submarine
          // as the Medium census. Low's complete frame has a tighter ceiling.
          expect(count.triangles + 200_000, count.name).toBeLessThan(500_000);
        }
        const ray = new THREE.Raycaster();
        for (const view of a.views) {
          expect(
            view.position.y - a.terrain.sampleHeight(view.position.x, view.position.z),
            view.name,
          ).toBeGreaterThan(a.config.submarine.hullRadius);
          ray.set(
            new THREE.Vector3(view.position.x, 100, view.position.z),
            new THREE.Vector3(0, -1, 0),
          );
          const hit = ray.intersectObject(a.terrain.group, true)[0]!;
          expect(hit).toBeDefined();
          expect(
            Math.abs(hit.point.y - a.terrain.sampleHeight(view.position.x, view.position.z)),
          ).toBeLessThan(0.001);
        }
        return;
      }
      expect(a.terrain.stats).toEqual(b.terrain.stats);
      expect(a.counts).toEqual(b.counts);
      expect(a.pose).toEqual(b.pose);
      const meshes = (scene: typeof a) =>
        scene.terrain.group.children.filter((o) => (o as THREE.Mesh).isMesh) as THREE.Mesh[];
      for (let k = 0; k < meshes(a).length; k++) {
        for (const attr of ['position', 'normal', 'aCavity']) {
          const x = meshes(a)[k]!.geometry.getAttribute(attr).array;
          const y = meshes(b)[k]!.geometry.getAttribute(attr).array;
          expect(x.length).toBe(y.length);
          expect(x.every((v, i) => Object.is(v, y[i]))).toBe(true);
        }
        for (const lod of [0, 1, 2]) {
          const chunks = (t: typeof a) =>
            (t.terrain as unknown as { chunks: TerrainChunk[] }).chunks;
          chunks(a)[k]!.setLod(lod);
          chunks(b)[k]!.setLod(lod);
          const x = meshes(a)[k]!.geometry.getIndex()!.array;
          const y = meshes(b)[k]!.geometry.getIndex()!.array;
          expect(x.length).toBe(y.length);
          expect(x.every((v, i) => v === y[i])).toBe(true);
        }
      }
    } finally {
      a.terrain.dispose();
      b.terrain.dispose();
    }
  }, 60_000);
}
