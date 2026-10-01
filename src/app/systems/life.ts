/**
 * Marine life (F2-LIFE, docs/life.md): instanced, steering-driven animals
 * around the sub from the site's spawn table in `data/life/life.json`.
 *
 *  - The animals are scan targets for the existing scanner (extra, moving
 *    targets that never displace a POI); a first scan logs a Journal entry.
 *  - Photo mode names the animal in frame (see the photo system).
 *  - `?life=0` turns the whole thing off.
 *
 * Debug: `window.__game.life` (`stats`, `spawnNear`, `spawnRare`, `clear`).
 */

import { SPECIES_BY_ID } from '../../world/life/catalogue.js';
import { Life, LIFE_ID_PREFIX } from '../../world/life/Life.js';
import { loadLifeDoc } from '../../world/life/tables.js';
import type { SubInfo } from '../../world/life/agent.js';
import type { GameSystem } from '../System.js';

export function createLifeSystem(): GameSystem {
  const sub: SubInfo = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    fx: 0,
    fy: 0,
    fz: -1,
    speed: 0,
    lightsOn: true,
    hullR: 6,
  };
  let life: Life | null = null;
  let disposers: Array<() => void> = [];

  return {
    name: 'life',
    init(ctx) {
      const { params, scene, tier, contentLandmark, terrain, currents, bus, discovery, config } =
        ctx;
      ctx.life = null;
      // A getter: `window.__game` copies descriptors once, before the table has loaded.
      ctx.expose({
        get life() {
          return life;
        },
      });
      if (params.get('life') === '0') return;
      const seed = Number(params.get('lifeSeed') ?? '') || undefined;
      void loadLifeDoc().then((doc) => {
        const table = doc.sites[contentLandmark];
        const opts: ConstructorParameters<typeof Life>[0] = {
          tier,
          table,
          scene,
          landmarkId: contentLandmark,
          env: {
            groundAt: (x, z) => terrain.sampleHeight(x, z),
            current: (x, z, out) => {
              currents.sample(x, z, out);
            },
          },
        };
        if (seed !== undefined) opts.seed = seed;
        life = new Life(opts);
        ctx.life = life;
        discovery.scanner.setExtraTargets(life.targets);
        disposers.push(
          bus.on('scan:complete', (e) => {
            if (!e.poiId.startsWith(LIFE_ID_PREFIX)) return;
            const id = e.poiId.slice(LIFE_ID_PREFIX.length);
            const def = SPECIES_BY_ID.get(id);
            if (def) discovery.onLifeScan(def.common, e.firstTime, `life/${id}`);
          }),
          bus.on('mission:restart', () => life?.clear()),
        );
      });
      sub.hullR = config.submarine.hullRadius * 0.9;
    },
    frame: {
      'world.life': (f, ctx) => {
        if (!life) return;
        const p = f.pilotPosition;
        const v = f.pilotVelocity;
        const fw = f.pilotForward;
        sub.x = p.x;
        sub.y = p.y;
        sub.z = p.z;
        sub.vx = v.x;
        sub.vy = v.y;
        sub.vz = v.z;
        sub.fx = fw.x;
        sub.fy = fw.y;
        sub.fz = fw.z;
        sub.speed = v.length();
        sub.lightsOn = ctx.headlights.on;
        sub.hullR = ctx.rov.deployed ? 1.6 : ctx.config.submarine.hullRadius * 0.9;
        life.update(
          f.frozen ? 0 : f.dt,
          sub,
          ctx.rig.camera,
          ctx.renderer.domElement.height,
          f.fog.density,
        );
      },
    },
    dispose() {
      for (const d of disposers) d();
      disposers = [];
      life?.dispose();
      life = null;
    },
  };
}
