/**
 * The Journal (D-FLOW, docs/missions.md): reads the persistent discovery store
 * for every site, lists this dive's site first, and opens on its front page
 * from home. The pause menu offers "Surface and debrief" while a mission dive
 * is on.
 */

import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const journalSystem: GameSystem = {
  name: 'journal',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { discovery, contentLandmark, app, bus, missionRouter, pause } = ctx;
    const journal = discovery.guide;
    ctx.journal = journal;
    journal.setStore(discovery.store);
    journal.setCurrentSite(contentLandmark);
    journal.setHomeMode(app.state === 'home');
    cleanup.add(bus.on('app:state', ({ state }) => journal.setHomeMode(state === 'home')));
    if (missionRouter) {
      const surface = document.createElement('button');
      surface.type = 'button';
      surface.className = 'pause-surface';
      surface.textContent = 'Surface and debrief';
      surface.hidden = true;
      surface.addEventListener('click', () => {
        ctx.setAppState('dive');
        missionRouter.endDive();
      });
      const pauseActions = pause.root.querySelector('.pause-actions');
      const quitButton = [...(pauseActions?.querySelectorAll('button') ?? [])].find(
        (b) => b.textContent === 'Quit to home',
      );
      pauseActions?.insertBefore(surface, quitButton ?? null);
      cleanup.add(
        bus.on('app:state', ({ state }) => {
          if (state === 'pause') surface.hidden = !missionRouter.canEndDive;
        }),
      );
    }
    ctx.expose({ journal });
  },
};
