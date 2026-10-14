/**
 * Discovery (B1): POIs, scan beam, discoveries, the Journal (J) and the
 * free-dive debrief. `?landmark=` picks the content folder, `?poi=` spawns next
 * to a POI, `?debrief=1` opens the debrief after a few seconds.
 * See docs/discovery.md.
 */

import { Discovery } from '../../game/Discovery.js';
import { nextScanObjective } from '../../game/Mission.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const discoverySystem: GameSystem = {
  name: 'discovery',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { bus, config, meta, terrain, contentLandmark, params, sub, rig } = ctx;
    const discovery = new Discovery({
      bus,
      config: { ...config, scan: ctx.effective.scan, submarine: ctx.effective.submarine },
      meta,
      seabed: terrain,
      landmarkId: contentLandmark,
      params,
      // `input` is built by a later system; this is only called once frames run.
      keyLabel: (action) => ctx.input.primaryKeyLabel(action),
      teleport: (pose) => {
        sub.reset(pose.x, pose.y, pose.z, pose.yaw);
        rig.snap(sub.position, sub.yaw, sub.pitch);
      },
    });
    ctx.discovery = discovery;
    ctx.guidance = discovery.overlay.slot;
    ctx.journal = discovery.guide;
    ctx.discoveries = discovery.store;
    cleanup.add(() => discovery.dispose());
    ctx.expose({
      scanner: discovery.scanner,
      discoveries: discovery.store,
      discovery,
      guidance: discovery.overlay.slot,
      debrief: discovery.debrief,
      fieldGuide: discovery.guide,
    });
  },
  frame: {
    'scan.discovery': (f, ctx) => {
      // Select before the beam locks; guidance runs later in the same frame.
      ctx.discovery.scanner.setObjective(
        nextScanObjective(ctx.missionRouter?.mission.objectives)?.poiId ?? null,
      );
      // An open Journal freezes piloting, but its pad button must still close it.
      const input =
        ctx.discovery.guide.isOpen && ctx.discovery.guide.isTop && f.sampled.toggleGuide
          ? { ...f.state, toggleGuide: true }
          : f.state;
      ctx.discovery.update(
        f.steps * f.fixedDt,
        f.dt,
        f.pilotPosition,
        f.pilotForward,
        ctx.missionRouter?.debriefOpen ? { ...input, scan: false } : input, // B3: no beam under the debrief
        ctx.rig.camera,
        f.clockDt,
        f.frozen || f.blocked || ctx.app.state !== 'dive' || !!ctx.missionRouter?.debriefOpen,
      );
    },
  },
};
