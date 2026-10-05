// @ts-expect-error Node types are intentionally absent from the browser tsconfig.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AmbientLight, Color, FogExp2, Scene, Vector3 } from 'three';
import type { GameContext } from '../../src/app/context.js';
import { cameraControlsSystem } from '../../src/app/systems/camera.js';
import { makeConfig } from '../../src/core/Config.js';
import { EventBus } from '../../src/core/EventBus.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../src/game/Spawn.js';
import { sampleAtmosphere } from '../../src/render/Atmosphere.js';
import { CameraRig } from '../../src/sub/CameraRig.js';
import { latLonToWorld } from '../../src/util/geo.js';
import type { TileMeta } from '../../src/util/types.js';
import { Currents } from '../../src/world/Currents.js';
import { Props } from '../../src/world/Props.js';
import { Terrain } from '../../src/world/Terrain.js';
import { PresetSystem } from '../../src/world/presets/Presets.js';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

// Tighter Lost City acceptance than 380's broad five-site audit: use actual
// terrain/props and scene light, with no screenshot or GPU-brightness threshold.
describe('Lost City first-ten-second Arcade opening', () => {
  for (const tier of ['low', 'medium', 'high'] as const) {
    it(`${tier}: closer framed tower and a steady ambient floor through 40 m`, async () => {
      const config = makeConfig();
      const meta = read('data/tiles/lost-city/meta.json') as TileMeta;
      const bytes = readFileSync('data/tiles/lost-city/heightmap.bin');
      const heights = new Float32Array(bytes.buffer, bytes.byteOffset, meta.cols * meta.rows);
      const terrain = new Terrain({ meta, heights }, config.terrain, tier);
      const props = new Props(meta, terrain, config.props, tier);
      const mission = read('data/landmarks/lost-city/mission.json');
      const settings = spawnSettings(config);
      let presets: PresetSystem | undefined;
      try {
        await props.load('props.json', 'lost-city', async () =>
          read('data/landmarks/lost-city/props.json'),
        );
        expect(props.stats.failed).toBe(0);
        const hero = props.placed.find((p) => p.def.id === 'poseidon-tower')!;
        const spawn = (mode: 'arcade' | 'realistic' | 'custom') =>
          composedFreeDiveSpawn(
            'lost-city',
            meta,
            terrain,
            props,
            settings,
            -3000,
            config.camera,
            mode,
          )!;
        const legacy = spawn('realistic');
        expect(legacy).not.toBeNull();
        expect(spawn('custom')).toEqual(legacy);
        expect(
          Math.hypot(legacy.x - hero.root.position.x, legacy.z - hero.root.position.z),
        ).toBeCloseTo(44, 6);
        expect(legacy.chaseRadius).toBeUndefined();
        const pose = spawn('arcade');
        expect(pose).not.toBeNull();
        const position = new Vector3(pose.x, pose.y, pose.z);
        expect(
          Math.hypot(position.x - hero.root.position.x, position.z - hero.root.position.z),
        ).toBeCloseTo(38, 6);
        expect(pose.chaseRadius).toBe(50);
        expect(position.y - terrain.sampleHeight(position.x, position.z)).toBeGreaterThanOrEqual(
          settings.hullRadius + settings.seabedClearance + settings.spawnClearanceM,
        );
        expect(props.collide(position.clone(), settings.hullRadius + 4, new Vector3())).toBe(false);
        const rig = new CameraRig(config.camera, 16 / 9, terrain);
        rig.setChaseRadiusDefault(pose.chaseRadius, pose.chaseOffsetX);
        rig.snap(position, pose.yaw, 0);
        expect(rig.camera.position.distanceTo(hero.root.position)).toBeLessThan(95);
        // The full solid tower's axis fits vertically, on desktop and portrait.
        // Effect bounds include clear-fluid plumes, so use its authored 60 m relief.
        for (const aspect of [16 / 9, 390 / 844]) {
          rig.setAspect(aspect);
          rig.camera.updateMatrixWorld(true);
          for (const height of [0, hero.def.dimensionsM![2]]) {
            const point = hero.root.localToWorld(new Vector3(0, height, 0)).project(rig.camera);
            expect(Math.abs(point.x)).toBeLessThan(0.9);
            expect(Math.abs(point.y)).toBeLessThan(0.9);
            expect(point.z).toBeGreaterThan(-1);
            expect(point.z).toBeLessThan(1);
          }
        }
        const scene = new Scene();
        scene.fog = new FogExp2(0);
        scene.background = new Color();
        const ambient = new AmbientLight();
        const currents = new Currents('lost-city', 'lost-city', async () => null);
        await currents.ready;
        presets = new PresetSystem({
          scene,
          bus: new EventBus(),
          config,
          tier,
          params: new URLSearchParams(),
          tileId: 'lost-city',
          landmarkId: 'lost-city',
          missionId: null,
          terrain,
          props,
          discovery: { loaded: true, pois: [] },
          sub: { position, velocity: new Vector3(), floorFor: (ground) => ground + 12 },
          currents,
          currentMode: 'off',
          atmosphere: { ambient, caustics: null },
          headlights: { on: false },
          toWorld: (lat, lon) => latLonToWorld(meta, lat, lon),
          fetchJson: async (url) => (url.endsWith('/mission.json') ? mission : []),
        });
        await presets.ready;
        expect(presets.params.ambientFill).toBe(16); // Preserve the vent passes' tuning.
        for (const elapsed of [0, 5, 10]) {
          const atmo = sampleAtmosphere(config.water, rig.camera.position.y);
          scene.fog.density = atmo.fogDensity;
          presets.update(1 / 60, 0, atmo, rig.camera, 844, elapsed);
          expect(presets.entered).toBe(true);
          expect(ambient.intensity).toBeCloseTo(
            sampleAtmosphere(config.water, rig.camera.position.y).ambientIntensity + 16,
            8,
          );
          const y = 0.2126 * ambient.color.r + 0.7152 * ambient.color.g + 0.0722 * ambient.color.b;
          for (let bearing = -1; bearing < 8; bearing++) {
            const angle = (bearing * Math.PI) / 4;
            const radius = bearing < 0 ? 0 : 40;
            const x = position.x + radius * Math.cos(angle);
            const z = position.z + radius * Math.sin(angle);
            const floor = new Vector3(x, terrain.sampleHeight(x, z), z);
            const transmission = Math.exp(
              -Math.pow(scene.fog.density * rig.camera.position.distanceTo(floor), 2),
            );
            expect(ambient.intensity * y * transmission).toBeGreaterThan(2.5);
          }
        }
      } finally {
        presets?.dispose();
        terrain.dispose();
      }
    });
  }
});

it('Begin dive keeps the Lost City Arcade arm while resetting camera controls', () => {
  const config = makeConfig();
  for (const [site, mode, radius] of [
    ['lost-city', 'arcade', 50],
    ['lost-city', 'realistic', Math.hypot(38, 90)],
    ['lost-city', 'custom', Math.hypot(38, 90)],
    ['titanic', 'arcade', Math.hypot(38, 90)],
  ] as const) {
    const rig = new CameraRig(config.camera, 16 / 9);
    if (site === 'lost-city' && mode === 'arcade') rig.setChaseRadiusDefault(50);
    rig.chaseRadius = 180; // Begin restores the opening, not a pilot's previous zoom.
    rig.freeLook = true;
    rig.setMode('first-person');
    const bus = new EventBus();
    const ctx = {
      bus,
      rig,
      route: { landmarkId: site },
      settings: { gameplayMode: mode },
      hud: { root: { querySelector: () => null }, onResetCamera: () => () => {} },
      sub: { position: new Vector3(0, -775, 0), yaw: 0 },
      canvas: new EventTarget(),
      expose: () => {},
    } as unknown as GameContext;
    try {
      cameraControlsSystem.init!(ctx);
      bus.emit('mission:started', { missionId: site, tileId: site });
      expect(rig.chaseRadius).toBe(radius);
      expect(rig.freeLook).toBe(false);
      expect(rig.mode).toBe('chase');
    } finally {
      cameraControlsSystem.dispose!();
    }
  }
});
