/**
 * The ROV (D-ROV): a small tethered vehicle deployed from the sub. While it is
 * out the camera follows it, it takes the pilot's input, feels the current,
 * draws on the sub's battery and scans from a little further away.
 *
 * This system also owns the fixed-step physics loop: each step drives either
 * the ROV (when deployed) or the sub.
 */

import * as THREE from 'three';
import { Rov } from '../../rov/Rov.js';
import { RovVisual } from '../../rov/RovVisual.js';
import { RovHUD } from '../../ui/RovHUD.js';
import type { GameSystem } from '../System.js';

export function createRovSystem(): GameSystem {
  const rovCurrent = new THREE.Vector3();
  const cameraFromSub = new THREE.Vector3();
  const rovCameraAim = new THREE.Vector3();
  const tetherAnchor = new THREE.Vector3();
  let savedChaseRadius = 0;
  let abortRov: () => void = () => {};
  let rovScanRadii: number[] | null = null;
  return {
    name: 'rov',
    init(ctx) {
      const { config, terrain, settings, save, hud, scene, rig, sub, headlights, bus } = ctx;
      const rov = new Rov(config.rov, terrain);
      const rovVisual = new RovVisual(config.rov, ctx.tier);
      rovVisual.setLightPreset(config.lightPresets[settings.gameplay.lights]);
      save.onChange((next, changed) => {
        if (changed.includes('gameplay'))
          rovVisual.setLightPreset(config.lightPresets[next.gameplay.lights]);
      });
      const rovHud = new RovHUD(hud.root.querySelector('.hud-readouts') as HTMLElement);
      scene.add(rovVisual.group);
      Object.assign(ctx, { rov, rovVisual, rovHud });
      savedChaseRadius = rig.chaseRadius;
      abortRov = (): void => {
        if (!rov.deployed) return;
        rov.abort();
        rig.chaseRadius = savedChaseRadius;
        rig.setMode('chase');
        rig.snap(sub.position, sub.yaw, sub.pitch);
        rovHud.update(rov);
        rovVisual.update(rov, sub.position);
        headlights.setConesSuppressed(false);
      };
      bus.on('app:state', ({ state }) => {
        if (state !== 'dive') abortRov();
      });
      bus.on('mission:ended', abortRov);
      bus.on('mission:aborted', abortRov);
      bus.on('mission:restart', abortRov);
      bus.on('mission:started', abortRov);
      bus.on('sub:emergencyBlow', abortRov);
      ctx.expose({ rov, rovHud, rovVisual });
    },
    frame: {
      'sim.vehicles': (f, ctx) => {
        const { rov, sub, rig, config, currents, save } = ctx;
        const { state, steps } = f;
        if (f.blocked) abortRov(); // D-PHOTO: photo mode keeps the ROV out
        if (!f.frozen && state.toggleRov && !sub.getState().emergencyBlow) {
          if (rov.mode === 'piloting') rov.retrieve();
          else if (!rov.deployed && rov.deploy(sub.position, sub.yaw)) {
            sub.velocity.set(0, 0, 0);
            rig.setMode('chase');
            savedChaseRadius = rig.chaseRadius;
            rig.chaseRadius = config.rov.cameraDistanceM;
            rig.snap(rov.position, rov.yaw, 0);
          }
        }
        const currentMode = save.get().gameplay.currents;
        for (let i = 0; i < steps; i++) {
          if (rov.deployed) {
            currents.sample(rov.position.x, rov.position.z, rovCurrent);
            rovCurrent.multiplyScalar(
              currentMode === 'off'
                ? 0
                : currentMode === 'gentle'
                  ? config.currents.gentleScale
                  : 1,
            );
            rov.step(f.fixedDt * sub.simSpeed, state, sub.position, rovCurrent);
            if (!rov.deployed) {
              rig.chaseRadius = savedChaseRadius;
              rig.snap(sub.position, sub.yaw, sub.pitch);
            }
          } else sub.step(state, f.fixedDt);
        }
      },
      pose: (f, ctx) => {
        const { rov, rovVisual, rovHud, subMesh, headlights } = ctx;
        rovVisual.update(rov, subMesh.tetherAnchor(tetherAnchor), f.dt);
        rovHud.update(rov);
        // Only the additive beam geometry is hidden; the sub's actual lamps stay on.
        headlights.setConesSuppressed(rov.deployed);
      },
      'camera.pilot': (f, ctx) => {
        const { rov } = ctx;
        if (!rov.deployed) return;
        f.pilotPosition = rov.position;
        f.pilotForward = rov.forward;
        f.pilotYaw = rov.yaw;
        f.pilotPitch = 0;
        f.pilotVelocity = rov.velocity;
      },
      'camera.rov': (_f, ctx) => {
        const { rov, rig, sub, subMesh, config } = ctx;
        if (!rov.deployed || rig.mode === 'orbit') return;
        rig.camera.position.y += config.rov.cameraRaiseM;
        cameraFromSub.copy(rig.camera.position).sub(sub.position);
        const distance = cameraFromSub.length();
        if (distance < config.rov.mothershipCameraClearanceM) {
          if (distance < 0.001) cameraFromSub.copy(rov.forward);
          cameraFromSub.normalize().multiplyScalar(config.rov.mothershipCameraClearanceM);
          rig.camera.position.copy(sub.position).add(cameraFromSub);
        }
        rovCameraAim.copy(rov.position).addScaledVector(rov.forward, config.rov.cameraLookAheadM);
        rovCameraAim.y += config.rov.cameraAimAboveM;
        rig.camera.lookAt(rovCameraAim);
        subMesh.group.visible =
          rig.camera.position.distanceTo(sub.position) > config.rov.mothershipCameraClearanceM + 3;
      },
      'scan.rovRange': (_f, ctx) => {
        const { rov, discovery, config } = ctx;
        rovScanRadii = rov.deployed
          ? discovery.pois.map((poi) => {
              const radius = poi.radius;
              poi.radius *= config.rov.scanRangeFactor;
              return radius;
            })
          : null;
      },
      'scan.rovRangeRestore': (_f, ctx) => {
        const radii = rovScanRadii;
        if (radii)
          ctx.discovery.pois.forEach((poi, index) => {
            poi.radius = radii[index]!;
          });
      },
    },
  };
}
