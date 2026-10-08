// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Input } from '../../src/core/Input.js';
import { Discovery } from '../../src/game/Discovery.js';
import { DiscoveryStore, DISCOVERY_STORAGE_KEY } from '../../src/game/DiscoveryStore.js';
import { parseGuide } from '../../src/game/Guide.js';
import { buildJournalSite, isEntryUnlocked } from '../../src/game/JournalData.js';
import { parsePois, placePois } from '../../src/game/Pois.js';
import { Scanner } from '../../src/game/Scanner.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import type { TileMeta } from '../../src/util/types.js';
import { createLostCityCarbonateMaterial } from '../../src/world/LostCityCarbonate.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { terrainCarveFor } from '../../src/world/terrainFeatures.js';
import legacy from '../fixtures/f30-legacy-discoveries.json' with { type: 'json' };

const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
afterEach(() => vi.unstubAllGlobals());

it('880: a queued Journal key opens only when a frame samples it and does not toggle again', () => {
  const input = new Input({ storage: null });
  const guide = {
    isOpen: false,
    toggle: () => {
      guide.isOpen = !guide.isOpen;
    },
    setFooter: vi.fn(),
  };
  // Keep the real input edge and Discovery.update path; replace DOM views only.
  const discovery: Discovery = Object.assign(Object.create(Discovery.prototype), {
    opts: { keyLabel: (id: 'scan' | 'toggleGuide') => input.primaryKeyLabel(id) },
    guide,
    debrief: { isOpen: false },
    scanner: new Scanner(makeConfig().scan, new EventBus()),
    stats: { update: vi.fn() },
    overlay: { setSuppressed: vi.fn(), update: vi.fn() },
  });
  const frame = () => {
    const sampled = input.sample();
    discovery.update(0, 1 / 60, new THREE.Vector3(), new THREE.Vector3(0, 0, -1), sampled);
    input.endFrame();
  };
  input.injectKey('KeyJ', true);
  input.injectKey('KeyJ', false);
  expect(guide.isOpen).toBe(false);
  frame();
  expect(guide.isOpen).toBe(true);
  expect(discovery.scanner.enabled).toBe(false);
  frame();
  expect(guide.isOpen).toBe(true);
});

for (const tier of ['low', 'medium', 'high', 'ultra'] as const) {
  it(`880 Monterey ${tier}: cubic reconstruction retains the canyon carve at survey knots`, () => {
    const cfg = makeConfig();
    const meta = json('data/tiles/monterey-canyon/meta.json') as TileMeta;
    const bytes = readFileSync('data/tiles/monterey-canyon/heightmap.bin');
    const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
    const terrain = new Terrain({ meta, heights }, cfg.terrain, tier);
    const carve = terrainCarveFor(meta)!;
    try {
      let checked = 0;
      for (let r = 1; r < meta.rows - 1; r++) {
        for (let c = 1; c < meta.cols - 1; c++) {
          const x = terrain.worldXOfCol(c),
            z = terrain.worldZOfRow(r);
          const survey = heights[r * meta.cols + c] * cfg.terrain.verticalExaggeration;
          const carved = carve.apply(x, z, survey);
          if (survey - carved < 50) continue;
          checked++;
          // Cubic interpolation preserves source knots. At these vertices the
          // final mesh must retain the independent site carve plus its detail.
          expect(terrain.sampleHeight(x, z)).toBeCloseTo(carved + terrain.detailHeight(x, z), 4);
        }
      }
      expect(checked).toBeGreaterThan(5);
    } finally {
      terrain.dispose();
    }
  }, 20_000);
}

for (const site of ['titanic', 'great-blue-hole']) {
  for (const tier of ['low', 'medium'] as const) {
    it(`880 ${site} ${tier}: opening target stays in front of terrain at all three viewports`, async () => {
      const cfg = makeConfig();
      const meta = json(`data/tiles/${site}/meta.json`) as TileMeta;
      const bytes = readFileSync(`data/tiles/${site}/heightmap.bin`);
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, cfg.terrain, tier);
      const props = new Props(meta, terrain, cfg.props, tier);
      try {
        await props.placeAll(json(`data/landmarks/${site}/props.json`), site);
        const pois = placePois(
          parsePois(json(`data/landmarks/${site}/pois.json`)),
          meta,
          terrain,
          cfg.scan,
          site,
        );
        const pose = composedFreeDiveSpawn(
          site,
          meta,
          terrain,
          props,
          spawnSettings(cfg),
          -11000,
          cfg.camera,
          'arcade',
        )!;
        const position = new THREE.Vector3(pose.x, pose.y, pose.z);
        const scanner = new Scanner(cfg.scan, new EventBus());
        scanner.setTargets(pois);
        scanner.update(
          0,
          position,
          new THREE.Vector3(Math.sin(pose.yaw), 0, -Math.cos(pose.yaw)),
          false,
        );
        const target = pois.find((p) => p.id === scanner.view.nearestId)!;
        expect(target).toBeDefined();
        terrain.group.updateMatrixWorld(true);
        for (const [width, height] of [
          [1280, 800],
          [390, 844],
          [844, 390],
        ]) {
          const rig = new CameraRig(cfg.camera, width / height, terrain);
          rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX, pose.chaseOffsetY);
          rig.snap(position, pose.yaw, 0);
          rig.camera.updateMatrixWorld(true);
          const ndc = target.position.clone().project(rig.camera);
          expect(Math.abs(ndc.x)).toBeLessThan(1);
          expect(Math.abs(ndc.y)).toBeLessThan(1);
          expect(ndc.z).toBeGreaterThan(-1);
          expect(ndc.z).toBeLessThan(1);
          const distance = rig.camera.position.distanceTo(target.position);
          // Contact geometry may occupy the last metres around its anchor;
          // an intervening terrain bank must not obscure the approach.
          const ray = new THREE.Raycaster(
            rig.camera.position,
            target.position.clone().sub(rig.camera.position).normalize(),
            0,
            Math.max(0, distance - 10),
          );
          expect(ray.intersectObject(terrain.group, true), `${width}x${height}`).toHaveLength(0);
          const relief = props.placed.find((p) => p.def.id === 'blue-hole-wall-relief');
          if (relief) {
            relief.full.updateWorldMatrix(true, true);
            expect(
              ray.intersectObject(relief.full, true),
              '830 must not cover the opening contact',
            ).toHaveLength(0);
          }
          if (site === 'titanic') {
            // 780 begins at 300 view metres and belongs only to terrain.
            expect(distance).toBeLessThan(300);
            for (const prop of props.placed)
              prop.full.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                for (const material of Array.isArray(object.material)
                  ? object.material
                  : [object.material]) {
                  expect(material.customProgramCacheKey()).not.toContain('abyss-fade');
                }
              });
          }
        }
      } finally {
        // Props has no dispose API; release the procedural resources owned by this fixture.
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        props.group.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          geometries.add(o.geometry);
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        terrain.dispose();
      }
    }, 20_000);
  }
}

describe('880 content compatibility after f30', () => {
  for (const [site, historical] of Object.entries(legacy.sites)) {
    it(`${site}: a legacy discovery unlocks its authored Journal entry after two reloads`, () => {
      const pois = parsePois(json(`data/landmarks/${site}/pois.json`));
      const guide = parseGuide(json(`data/landmarks/${site}/guide.json`), site)!;
      expect(guide.entries.map((e) => e.id)).toEqual(expect.arrayContaining(historical.guide_ids));
      for (const old of historical.pois) {
        const current = pois.find((p) => p.id === old.id);
        expect(current?.guide_entry, `f27 saved contact ${old.id}`).toBe(old.guide_entry);
      }
      const journal = buildJournalSite({
        id: site,
        pois,
        guide,
        species: null,
        life: null,
        secrets: [],
      });
      const data = new Map<string, string>([
        [DISCOVERY_STORAGE_KEY, JSON.stringify(historical.pois.map((p) => `${site}/${p.id}`))],
      ]);
      const storage = {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
          data.set(key, value);
        },
        removeItem: (key: string) => {
          data.delete(key);
        },
      };
      const store = new DiscoveryStore(storage);
      for (const old of historical.pois) {
        const poi = pois.find((p) => p.id === old.id)!;
        const entry = journal.entries.find((e) => e.poiIds.includes(poi.id))!;
        expect(entry?.guide?.paragraphs.length, poi.id).toBeGreaterThan(0);
        expect(isEntryUnlocked(journal, entry, store), poi.id).toBe(true);
        store.record(site, poi.id);
      }
      const saved = store.snapshot();
      for (let reload = 0; reload < 2; reload++)
        expect(new DiscoveryStore(storage).snapshot()).toEqual(saved);
    });
  }
});

it('880 Lost City: late image completion cannot bind to an old field or dispose a new field', async () => {
  const pending: Array<{ onload(): void; onerror(): void }> = [];
  class ImageStub {
    onload = () => {};
    onerror = () => {};
    set src(_src: string) {
      pending.push(this);
    }
  }
  vi.stubGlobal('Image', ImageStub);
  const old = createLostCityCarbonateMaterial('medium');
  const oldFallback = old.userData.uniforms.carbonateAlbedo.value;
  old.dispose();
  const low = createLostCityCarbonateMaterial('low');
  const medium = createLostCityCarbonateMaterial('medium');
  expect(pending).toHaveLength(4); // Old two maps; new shared albedo and detailed normal.
  pending[0].onload();
  pending[1].onload();
  await old.userData.texturesReady;
  expect(old.userData.uniforms.carbonateAlbedo.value).toBe(oldFallback);
  pending[2].onload();
  pending[3].onload();
  await Promise.all([low.userData.texturesReady, medium.userData.texturesReady]);
  const shared = low.userData.uniforms.carbonateAlbedo.value as THREE.Texture;
  expect(medium.userData.uniforms.carbonateAlbedo.value).toBe(shared);
  const release = vi.spyOn(shared, 'dispose');
  low.dispose();
  expect(release).not.toHaveBeenCalled();
  medium.dispose();
  expect(release).toHaveBeenCalledOnce();
});
