/**
 * The app shell (D-SHELL, ): home screen, pause menu, site lists, the two
 * globes (overlay and home), app state (home / dive / pause) and the Escape
 * key. Selecting a site navigates to its URL; the page reloads into the dive.
 */

import { contentUrl, fetchContentJson } from '../../game/ContentPath.js';
import { loadMissionSummaries } from '../../game/Mission.js';
import { loadSpecies } from '../../game/Species.js';
import { buildDataCredits } from '../../ui/DataCredits.js';
import { onUnhandledKeyDown } from '../../ui/FocusTrap.js';
import { Globe } from '../../ui/Globe.js';
import { Home } from '../../ui/Home.js';
import { MissionSelect, missionUrl, tileUrl } from '../../ui/MissionSelect.js';
import { PauseMenu } from '../../ui/PauseMenu.js';
import type { AppState, ShellContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();
const globeCleanup = new Disposables();
const keysCleanup = new Disposables();

/** The mission a first-time player dives into from Home. */
const FIRST_MISSION_ID = 'titanic';

/** localStorage key for the last mission dived (Home's Dive button continues it). */
export const LAST_SITE_KEY = 'subexplorer.lastSite.v1';

/** The saved last mission id, or null when absent or malformed. */
export function readLastSite(): string | null {
  try {
    const value = JSON.parse(localStorage.getItem(LAST_SITE_KEY) ?? 'null') as unknown;
    if (typeof value !== 'object' || value === null) return null;
    const id = (value as { missionId?: unknown }).missionId;
    return typeof id === 'string' && /^[a-z0-9-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const shellSystem: GameSystem = {
  name: 'shell',
  dispose: () => cleanup.dispose(),
  init: initializeShell,
  frame: {
    // Modals and the shell freeze the dive without queuing input.
    'gate.shell': (f, ctx) => {
      const { app, missionRouter, globe, settingsScreen, discovery } = ctx;
      f.shellFrozen =
        !!globalThis.document?.hidden ||
        app.state !== 'dive' ||
        (missionRouter?.frozen ?? false) ||
        globe.isOpen ||
        settingsScreen.isOpen ||
        discovery.guide.isOpen;
      f.blocked =
        f.shellFrozen || discovery.debrief.isOpen || (missionRouter?.debriefOpen ?? false);
      f.frozen = f.shellFrozen || discovery.debrief.isOpen;
    },
  },
};

/** Shared menu construction; no tile or dive simulation is required. */
export function initializeShell(ctx: ShellContext): void {
  const { index, meta, route, bus, save, journal, discoveries, app } = ctx;
  let disposed = false;
  const missionSelect = new MissionSelect(index, {
    currentTileId: meta?.id,
    currentMissionId: route?.missionId,
    collapsed: route !== null,
  });
  ctx.missionSelect = missionSelect;
  ctx.missionSummaries = [];
  // A saved mission that the catalogue no longer lists falls back to the opening one.
  const diveSite = (): string => {
    const known = ctx.missionSummaries.some((entry) => entry.id === app.lastSite);
    return app.lastSite && known ? app.lastSite : FIRST_MISSION_ID;
  };
  const home = new Home(
    {
      dive: () => selectMission(diveSite()),
      journal: () => journal.open(),
      settings: () => ctx.settingsScreen.open(),
      controls: () => ctx.controlsCard.open(),
    },
    // The game mode selector on the home screen.
    document.body,
    save,
  );
  ctx.home = home;
  const updateDiveSite = (): void =>
    home.setDiveSite(ctx.missionSummaries.find((entry) => entry.id === diveSite())?.title ?? null);
  const completion = (id: string, pois: string[]): string =>
    `${pois.filter((poi) => discoveries.isDiscovered(id, poi)).length}/${pois.length} logged`;
  const summaries = loadMissionSummaries();
  const selectMission = (id: string): void => {
    const m = ctx.missionSummaries.find((entry) => entry.id === id);
    bus.emit('app:siteSelected', { missionId: id, tileId: m?.tile ?? id });
    window.location.href = missionUrl(ctx.shellBaseHref(), id);
  };
  const selectTile = (id: string): void => {
    bus.emit('app:siteSelected', { missionId: null, tileId: id });
    window.location.href = tileUrl(ctx.shellBaseHref(), id);
  };
  const homeSites = new MissionSelect(index, {
    parent: home.sitesSlot,
    presentation: 'shell',
    onSelect: selectTile,
    onSelectMission: selectMission,
    completion,
    onSiteFocus: (id) => ctx.homeGlobe.previewSite(id),
  });
  ctx.homeSites = homeSites;
  const objectiveHints = new Map<string, string>();
  const pause = meta
    ? new PauseMenu({
        resume: () => ctx.setAppState('dive'),
        journal: () => journal.open(),
        settings: () => ctx.settingsScreen.open(),
        controls: () => ctx.controlsCard?.open(),
        controlsLabel: () => (ctx.controlsCard?.device === 'touch' ? 'How to play' : 'Controls'),
        credits: () => buildDataCredits(meta),
        quit: () => {
          history.pushState({}, '', ctx.shellBaseHref());
          ctx.setAppState('home');
        },
        objectives: () =>
          ctx.missionRouter?.mission.objectives.map((objective) => ({
            title: objective.title,
            hint: objectiveHints.get(objective.id) ?? 'Explore the site to locate this objective.',
            complete: objective.complete,
            primary: objective.primary,
          })) ?? [],
      })
    : undefined;
  ctx.pause = pause;
  cleanup.add(() => {
    disposed = true;
    pause?.dispose();
    homeSites.dispose();
    home.dispose();
    missionSelect.dispose();
  });
  if (route)
    void fetchContentJson(contentUrl(route.missionId, 'mission.json')).then((raw) => {
      if (typeof raw !== 'object' || raw === null) return;
      const objectives = (raw as { objectives?: unknown }).objectives;
      if (!Array.isArray(objectives)) return;
      for (const entry of objectives) {
        if (typeof entry?.id === 'string' && typeof entry?.hint === 'string')
          objectiveHints.set(entry.id, entry.hint);
      }
    });
  void summaries.then((list) => {
    if (disposed) return;
    ctx.missionSummaries = list;
    missionSelect.setMissions(list);
    homeSites.setMissions(list);
    updateDiveSite();
  });
  cleanup.add(
    bus.on('mission:started', ({ missionId }) => {
      app.lastSite = missionId;
      updateDiveSite();
      try {
        localStorage.setItem(LAST_SITE_KEY, JSON.stringify({ missionId }));
      } catch {
        /* optional */
      }
    }),
  );
  ctx.setAppState = (state: AppState): void => {
    app.state = state;
    document.body.dataset.appState = state;
    // The embedded globe is open only in the home sites subview.
    if (state === 'home') {
      pause?.close();
      home.show();
    } else {
      home.hide();
      if (state === 'pause') {
        document.exitPointerLock?.();
        pause?.open();
      } else pause?.close();
    }
    reconcileHomeGlobe();
    bus.emit('app:state', { state });
  };
  const reconcileHomeGlobe = (): void => {
    if (!ctx.homeGlobe) return;
    if (app.state === 'home' && home.isOpen && home.sitesOpen) ctx.homeGlobe.open('api');
    else ctx.homeGlobe.close();
  };
  cleanup.listen(home.root, 'home:sites', reconcileHomeGlobe);
  // D-INPUT-HUD: the in-dive list is reached through the pause menu now.
  missionSelect.root.hidden = true;
  ctx.expose({
    missionSelect,
    home,
    pause,
    get appState() {
      return app.state;
    },
  });
}

/**
 * Globe mission select (docs/globe.md): `?globe=1` and shell site pins.
 * While open it freezes the game like the briefing. Also loads the site's
 * species list for the Journal.
 */
export const globeSystem: GameSystem<ShellContext, { dt: number }> = {
  name: 'globe',
  dispose: () => globeCleanup.dispose(),
  init(ctx) {
    const { config, bus, index, contentLandmark, home, homeSites, missionSelect } = ctx;
    const siteSelected = (site: { id: string; state: string }): void =>
      bus.emit('app:siteSelected', {
        missionId: site.state === 'mission' ? site.id : null,
        tileId: ctx.missionSummaries.find((m) => m.id === site.id)?.tile ?? site.id,
      });
    const globe = new Globe({
      config: config.globe,
      bus,
      tileIds: index.map((t) => t.id),
      currentId: contentLandmark,
      onSiteSelected: siteSelected,
    });
    ctx.globe = globe;
    const homeGlobe = new Globe({
      config: config.globe,
      bus,
      tileIds: index.map((t) => t.id),
      currentId: contentLandmark,
      parent: home.globeSlot,
      embedded: true,
      onSiteFocus: (id) => homeSites.highlightSite(id),
      onSiteSelected: siteSelected,
    });
    ctx.homeGlobe = homeGlobe;
    globeCleanup.add(() => {
      homeGlobe.dispose();
      globe.dispose();
    });
    void homeGlobe.catalog.then((c) => homeSites.setPending(c.pending));
    if (ctx.app.state === 'home') ctx.setAppState('home');
    missionSelect.setGlobeHandler(() => globe.open('button'));
    void globe.catalog.then((c) => missionSelect.setPending(c.pending));
    if (contentLandmark)
      void loadSpecies(contentLandmark).then((doc) => ctx.journal.setSpecies(doc));
    if (ctx.params.get('globe') === '1') globe.open('url');
    ctx.expose({ globe, homeGlobe });
  },
  frame: {
    'play.globe': (f, ctx) => {
      ctx.globe.update(f.dt);
      ctx.homeGlobe.update(f.dt);
    },
  },
};

/** Escape pauses a dive only after the overlay stack leaves it unhandled. */
export const shellKeysSystem: GameSystem<ShellContext, unknown> = {
  name: 'shellKeys',
  dispose: () => keysCleanup.dispose(),
  init(ctx) {
    const { app } = ctx;
    keysCleanup.add(
      onUnhandledKeyDown((e) => {
        if (app.state !== 'dive' && (e.code === 'ControlLeft' || e.code === 'ControlRight')) {
          e.stopPropagation();
          return;
        }
        if (e.code !== 'Escape' || e.repeat || app.state !== 'dive') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        document.exitPointerLock?.();
        ctx.setAppState('pause');
      }),
    );
    if (app.state === 'dive') ctx.bus.emit('app:state', { state: 'dive' });
  },
};
