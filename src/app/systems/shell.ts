/**
 * The app shell (D-SHELL, C1): home screen, pause menu, site lists, the two
 * globes (overlay and home), app state (home / dive / pause) and the Escape
 * key. Selecting a site navigates to its URL; the page reloads into the dive.
 */

import { contentUrl, fetchContentJson } from '../../game/ContentPath.js';
import { loadMissionSummaries } from '../../game/Mission.js';
import { loadSpecies } from '../../game/Species.js';
import { Globe } from '../../ui/Globe.js';
import { Home } from '../../ui/Home.js';
import { MissionSelect, missionUrl, tileUrl } from '../../ui/MissionSelect.js';
import { PauseMenu } from '../../ui/PauseMenu.js';
import type { AppState } from '../context.js';
import type { GameSystem } from '../System.js';

/** localStorage key for the last mission dived (Continue). */
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
  init(ctx) {
    const { index, meta, route, bus, save, discovery, app } = ctx;
    const missionSelect = new MissionSelect(index, {
      currentTileId: meta.id,
      currentMissionId: route?.missionId,
      collapsed: route !== null,
    });
    ctx.missionSelect = missionSelect;
    ctx.missionSummaries = [];
    const home = new Home(
      {
        continueDive: () => {
          if (app.lastSite) {
            const m = ctx.missionSummaries.find((entry) => entry.id === app.lastSite);
            bus.emit('app:siteSelected', {
              missionId: app.lastSite,
              tileId: m?.tile ?? app.lastSite,
            });
            window.location.href = missionUrl(ctx.shellBaseHref(), app.lastSite);
          }
        },
        journal: () => discovery.guide.open(),
        settings: () => ctx.settingsScreen.open(),
        controls: () => {
          ctx.settingsScreen.open();
          ctx.settingsScreen.showControls(true);
        },
      },
      // D2-PREDIVE: the game mode selector on the home screen.
      document.body,
      save,
    );
    ctx.home = home;
    home.setContinue(app.lastSite);
    const completion = (id: string, pois: string[]): string =>
      `${pois.filter((poi) => discovery.store.isDiscovered(id, poi)).length}/${pois.length} logged`;
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
    const pause = new PauseMenu({
      resume: () => ctx.setAppState('dive'),
      journal: () => discovery.guide.open(),
      settings: () => ctx.settingsScreen.open(),
      controls: () => {
        ctx.settingsScreen.open();
        ctx.settingsScreen.showControls(true);
      },
      quit: () => {
        history.pushState({}, '', new URL('.', window.location.href));
        ctx.setAppState('home');
      },
      objectives: () =>
        ctx.missionRouter?.mission.objectives.map((objective) => ({
          title: objective.title,
          hint: objectiveHints.get(objective.id) ?? 'Explore the site to locate this objective.',
          complete: objective.complete,
          primary: objective.primary,
        })) ?? [],
    });
    ctx.pause = pause;
    const pauseSites = new MissionSelect(index, {
      parent: pause.sitesSlot,
      presentation: 'shell',
      onSelect: selectTile,
      onSelectMission: selectMission,
      completion,
    });
    ctx.pauseSites = pauseSites;
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
      ctx.missionSummaries = list;
      missionSelect.setMissions(list);
      homeSites.setMissions(list);
      pauseSites.setMissions(list);
      if (!list.some((m) => m.id === app.lastSite)) home.setContinue(null);
    });
    bus.on('mission:started', ({ missionId }) => {
      app.lastSite = missionId;
      home.setContinue(missionId);
      try {
        localStorage.setItem(LAST_SITE_KEY, JSON.stringify({ missionId }));
      } catch {
        /* optional */
      }
    });
    ctx.setAppState = (state: AppState): void => {
      app.state = state;
      document.body.dataset.appState = state;
      if (state === 'home') {
        pause.close();
        home.show();
        ctx.homeGlobe.open('api');
      } else {
        home.hide();
        ctx.homeGlobe.close();
        if (state === 'pause') {
          document.exitPointerLock?.();
          pause.open();
        } else pause.close();
      }
      bus.emit('app:state', { state });
    };
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
  },
  frame: {
    // While a modal is up nothing simulates and input is ignored (sampling
    // still runs, so edge presses do not queue up behind the card).
    'gate.shell': (f, ctx) => {
      const { app, missionRouter, globe, settingsScreen, discovery } = ctx;
      f.shellFrozen =
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

/**
 * Globe mission select (C1, docs/globe.md): `?globe=1` and shell site pins.
 * While open it freezes the game like the briefing. Also loads the site's
 * species list for the Journal.
 */
export const globeSystem: GameSystem = {
  name: 'globe',
  init(ctx) {
    const { config, bus, index, contentLandmark, home, homeSites, pauseSites, missionSelect } = ctx;
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
    void homeGlobe.catalog.then((c) => homeSites.setPending(c.pending));
    void globe.catalog.then((c) => pauseSites.setPending(c.pending));
    if (ctx.app.state === 'home') ctx.setAppState('home');
    missionSelect.setGlobeHandler(() => globe.open('button'));
    void globe.catalog.then((c) => missionSelect.setPending(c.pending));
    void loadSpecies(contentLandmark).then((doc) => ctx.discovery.guide.setSpecies(doc));
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

/**
 * Escape (D-SHELL): leaves photo mode, closes the home site list, or toggles
 * pause. Ctrl is swallowed outside a dive. Registered after the settings
 * screen and mission router so their capture-phase handlers see keys first.
 */
export const shellKeysSystem: GameSystem = {
  name: 'shellKeys',
  init(ctx) {
    const { app, discovery, home, pause } = ctx;
    const onShellKey = (e: KeyboardEvent): void => {
      if (app.state !== 'dive' && (e.code === 'ControlLeft' || e.code === 'ControlRight')) {
        e.stopPropagation();
        return;
      }
      if (
        e.code !== 'Escape' ||
        e.repeat ||
        ctx.settingsScreen.isOpen ||
        ctx.globe.isOpen ||
        discovery.guide.isOpen ||
        discovery.debrief.isOpen ||
        ctx.missionRouter?.briefing?.isOpen ||
        ctx.missionRouter?.debriefOpen
      )
        return;
      // D-PHOTO: Escape leaves photo mode first.
      if (ctx.photoMode.active) {
        e.preventDefault();
        e.stopImmediatePropagation();
        ctx.exitPhotoMode();
        return;
      }
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      if (app.state === 'home') {
        if (home.sitesOpen) {
          e.preventDefault();
          home.closeSites();
        }
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      if (app.state === 'pause') pause.escape();
      else ctx.setAppState('pause');
    };
    window.addEventListener('keydown', onShellKey, true);
    if (app.state === 'dive') ctx.bus.emit('app:state', { state: 'dive' });
  },
};
