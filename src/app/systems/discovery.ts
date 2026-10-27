/**
 * Discovery: POIs, scan beam, discoveries, the Journal (J) and the
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
    cleanup.add(
      bus.on('app:state', ({ state }) => {
        if (state !== 'dive') discovery.overlay.setSuppressed(true);
      }),
    );
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
      // Journal shortcuts remain available to the top Journal or Home overlay,
      // including Home reached by cancelling or leaving this dive runtime.
      const input =
        !globalThis.document?.hidden &&
        (ctx.discovery.guide.isOpen
          ? ctx.discovery.guide.isTop
          : ctx.app.state === 'home' && ctx.home.isTop) &&
        f.sampled.toggleGuide
          ? { ...f.state, toggleGuide: true }
          : f.state;
      ctx.discovery.update(
        f.steps * f.fixedDt,
        f.dt,
        f.pilotPosition,
        f.pilotForward,
        ctx.missionRouter?.debriefOpen ? { ...input, scan: false } : input, // No beam under the debrief
        ctx.rig.camera,
        f.clockDt,
        f.frozen || f.blocked || ctx.app.state !== 'dive' || !!ctx.missionRouter?.debriefOpen,
      );
    },
  },
};
