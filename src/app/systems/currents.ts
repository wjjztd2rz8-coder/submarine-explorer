/**
 * Water currents (D-CURRENTS): the attributed offline field for the site,
 * sampled by the presets (sub drift, snow) and the ROV, shown on the HUD.
 */

import { fetchContentJson } from '../../game/ContentPath.js';
import { Currents } from '../../world/Currents.js';
import type { GameSystem } from '../System.js';

export const currentsSystem: GameSystem = {
  name: 'currents',
  init(ctx) {
    const { meta, save } = ctx;
    const currents = new Currents(meta.id, meta.id, fetchContentJson);
    ctx.currents = currents;
    save.onChange((next, changed) => {
      if (!changed.includes('gameplay')) return;
      ctx.hud.setCurrentMode(next.gameplay.currents);
      ctx.presets.setCurrentMode(next.gameplay.currents);
    });
    ctx.expose({ currents });
  },
  frame: {
    'hud.feeds': (_f, ctx) => {
      ctx.hud.setCurrentStatus(ctx.currents.status);
    },
  },
};
