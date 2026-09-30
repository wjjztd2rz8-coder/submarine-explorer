/**
 * Discovery (B1): POIs, scan beam, discoveries, the Journal (J) and the
 * free-dive debrief. `?landmark=` picks the content folder, `?poi=` spawns next
 * to a POI, `?debrief=1` opens the debrief after a few seconds.
 * See docs/discovery.md.
 */

import { Discovery } from '../../game/Discovery.js';
import type { GameSystem } from '../System.js';

export const discoverySystem: GameSystem = {
  name: 'discovery',
  init(ctx) {
    const { bus, config, meta, terrain, contentLandmark, params, sub, rig } = ctx;
    const discovery = new Discovery({
      bus,
      config,
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
    ctx.expose({
      scanner: discovery.scanner,
      discoveries: discovery.store,
      discovery,
      debrief: discovery.debrief,
      fieldGuide: discovery.guide,
    });
  },
  frame: {
    'scan.discovery': (f, ctx) => {
      ctx.discovery.update(
        f.steps * f.fixedDt,
        f.dt,
        f.pilotPosition,
        f.pilotForward,
        ctx.missionRouter?.debriefOpen ? { ...f.state, scan: false } : f.state, // B3: no beam under the debrief
        ctx.rig.camera,
        f.clockDt,
      );
    },
  },
};
