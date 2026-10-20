/**
 * The submarine: physics body, spawn pose (free dive, mission, `?depth=`),
 * hull mesh, and the per-frame sub events the audio, HUD and mission listen to.
 * This system also advances submarine physics on the fixed-step clock.
 */

import * as THREE from 'three';
import { landmarkIdFor } from '../../game/ContentPath.js';
import { applyMissionLoadout } from '../../game/MissionRouter.js';
import { chooseFreeDiveHull, chooseSpawn, spawnHeight, spawnSettings } from '../../game/Spawn.js';
import { SubMesh } from '../../sub/SubMesh.js';
import { Submarine } from '../../sub/Submarine.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

export function createSubmarineSystem(): GameSystem {
  const cleanup = new Disposables();
  const forward = new THREE.Vector3();
  let lastHullStress = 0;
  let emergencyBlowAnnounced = false;
  return {
    name: 'submarine',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const { config, terrain, meta, route, params, spawnDepth, scene } = ctx;
      const sub = new Submarine(ctx.effective.submarine, terrain);
      ctx.sub = sub;
      // Free-dive spawn: over the tile centre, or the nearest
      // cell at least `minSpawnSeabedM` deep if the centre is a reef flat /
      // caldera rim; `?depth=` clamped between the surface and the seabed. Free
      // dive also fits the lowest hull class rated for the tile's deepest cell.
      // The loaded dive keeps its depth-fitted hull, including briefing and restarts.
      const targetDepth = route?.def.briefing.depth_m ?? Math.abs(meta.min_m);
      const hullClass = ctx.progress.hullFor(targetDepth);
      sub.setHullClass(hullClass);
      const spawn = chooseSpawn(terrain, meta, spawnDepth, spawnSettings(config));
      // Optional props must never be responsible for pressure safety.
      spawn.y = Math.max(spawn.y, sub.getState().ratedDepth + config.submarine.hullRadius);
      sub.reset(spawn.x, spawn.y, spawn.z, spawn.yaw);
      if (spawn.moved) {
        console.info(
          `[main] shallow tile centre: spawning ${Math.hypot(spawn.x, spawn.z).toFixed(0)} m out, seabed ${spawn.ground.toFixed(0)} m`,
        );
      }
      ctx.freeDiveHull = route
        ? null
        : chooseFreeDiveHull(
            config.submarine.hullClasses,
            meta.min_m,
            config.submarine.freeDiveHullMarginM,
          );
      // Mission surface start + hull class + sim speed. `?poi=` / `?at=`
      // later still override the pose (tests rely on them).
      if (route) {
        const pose = applyMissionLoadout(
          sub,
          { ...route.def, hull_class: hullClass },
          config,
          meta,
          terrain,
        );
        sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      }
      if (ctx.freeDiveHull) {
        const state = sub.getState();
        ctx.freeDiveHull.classId = state.hullClass;
        ctx.freeDiveHull.hull = config.submarine.hullClasses[state.hullClass];
        ctx.freeDiveHull.cleared =
          Math.abs(state.ratedDepth) >= Math.abs(meta.min_m) + config.submarine.freeDiveHullMarginM;
        ctx.hud?.setHullNote(ctx.freeDiveHull.cleared ? '' : 'at rating limit');
      }
      // D-START: keep URL probes deterministic even when a mission uses a
      // near-site default.
      if (route && spawnDepth !== null && !params.has('at') && !params.has('poi')) {
        const p = sub.position;
        sub.reset(
          p.x,
          spawnHeight(terrain.sampleHeight(p.x, p.z), spawnDepth, spawnSettings(config)),
          p.z,
          sub.yaw,
        );
      }
      ctx.contentLandmark = route?.landmarkId ?? landmarkIdFor(params, meta.id);
      sub.setSimSpeed(1);

      const subMesh = new SubMesh({
        length: 26,
        // The fitted hull class picks the model; the tier its detail.
        hullClass: sub.getState().hullClass,
        cosmetics: ctx.progress.cosmetics,
        tier: ctx.tier,
        // A faint rim and ambient floor keep the hull readable below 300 m.
        rimColor: config.submarine.hullRimColor,
        rimStrength: config.submarine.hullRimStrength,
        emissive: config.submarine.hullEmissive,
      });
      cleanup.add(() => subMesh.dispose());
      ctx.subMesh = subMesh;

      scene.add(subMesh.group);
      ctx.expose({ sub, subMesh });
    },
    frame: {
      'sim.vehicles': (f, ctx) => {
        for (let i = 0; i < f.steps; i++) ctx.sub.step(f.state, f.fixedDt);
      },
      'controls.vehicle': (f, ctx) => {
        if (f.state.toggleLights) ctx.headlights.toggle();
        if (f.state.cycleSimSpeed)
          ctx.bus.emit('sub:simSpeed', { multiplier: ctx.sub.cycleSimSpeed() });
      },
      events: (f, ctx) => {
        const { sub, bus, config } = ctx;
        const s = sub.getState();
        f.sub = s;
        if (s.touchedBottom) bus.emit('sub:collided', { depth: s.depth, speed: s.impactSpeed });
        if (s.crushWarning) bus.emit('sub:crushWarning', { depth: s.depth, ratio: s.crushRatio });
        // Hull stress and emergency blow feed audio, HUD and mission
        // restart. Only on a meaningful change, so a long pressure hold is not
        // a per-frame event storm for the audio bus.
        if (
          Math.abs(s.hullStress - lastHullStress) > config.submarine.hullStressEventThreshold ||
          (s.touchedBottom && s.hullStress > config.submarine.hullStressEventThreshold)
        ) {
          lastHullStress = s.hullStress;
          bus.emit('sub:hullStress', {
            stress: s.hullStress,
            cause: s.touchedBottom ? 'impact' : 'pressure',
            depth: s.depth,
          });
        }
        if (s.emergencyBlow && !emergencyBlowAnnounced) {
          emergencyBlowAnnounced = true;
          bus.emit('sub:emergencyBlow', {
            depth: s.depth,
            lockSeconds: config.submarine.emergencyBlowLockSeconds,
            cause: s.emergencyCause ?? 'crush',
          });
        } else if (!s.emergencyBlow) {
          emergencyBlowAnnounced = false;
        }
      },
      pose: (f, ctx) => {
        const { sub, subMesh, rig } = ctx;
        // Present the boat.
        subMesh.setHullClass(f.sub.hullClass);
        subMesh.vehicle.reduceMotion = rig.reduceMotion;
        subMesh.setPose(sub.position, sub.yaw, sub.pitch, sub.roll);
        subMesh.update(f.state.throttle, f.dt, {
          yaw: f.state.yaw,
          vertical: f.state.ballast,
          pitch: f.state.pitch,
          scanning: ctx.discovery.scanner.isScanning,
          lightsOn: ctx.headlights.on,
        });
        // First person looks out through the cockpit viewport instead of the
        // hull (which would fill the screen); chase and the photo orbit show it.
        subMesh.group.visible = true;
        subMesh.setView(rig.mode);
      },
      'camera.pilot': (f, ctx) => {
        const { sub } = ctx;
        sub.getForward(forward);
        f.forward = forward;
        f.pilotPosition = sub.position;
        f.pilotForward = forward;
        f.pilotYaw = sub.yaw;
        f.pilotPitch = sub.pitch;
        f.pilotVelocity = sub.velocity;
      },
    },
  };
}
