import { PROGRESS_CONFIG, UPGRADES } from '../../core/config/progress.js';
import { DiscoveryStore } from '../../game/DiscoveryStore.js';
import { PhotoStore } from '../../game/PhotoStore.js';
import { creditPreviousDives } from '../../game/ProgressMigration.js';
import { Progress, applyProgress, requiredHull } from '../../game/Progress.js';
import { Upgrades } from '../../ui/Upgrades.js';
import { tileUrl } from '../../ui/MissionSelect.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

/** Boot waits for retroactive rewards before deciding which hulls are available. */
export async function loadSavedProgress(): Promise<Progress> {
  const discoveries = new DiscoveryStore();
  const progress = new Progress();
  await creditPreviousDives(progress, discoveries, new PhotoStore().photos);
  return progress;
}

export function createProgressSystem(): GameSystem {
  const cleanup = new Disposables();
  let upgrades: Upgrades;
  let boostLeft: number = PROGRESS_CONFIG.boostSeconds;
  let lastPhotos: unknown = null;
  let initialLock = '';
  return {
    name: 'progress',
    init(ctx) {
      const progress = ctx.progress;
      const base = structuredClone(ctx.config);
      // makeConfig shares nested profile defaults. Clone maps before changing values.
      ctx.config.speedProfiles = { ...ctx.config.speedProfiles };
      ctx.config.lightPresets = { ...ctx.config.lightPresets };
      ctx.config.sensorPresets = { ...ctx.config.sensorPresets };
      applyProgress(ctx.config, base, progress, ctx.settings.gameplay);
      boostLeft = PROGRESS_CONFIG.boostSeconds * (1 + progress.level('boost') * UPGRADES[6].step);
      if (
        ctx.route &&
        !progress.canDive(ctx.route.def.briefing.depth_m ?? 0, ctx.settings.gameplayMode)
      ) {
        const hull = requiredHull(ctx.route.def.briefing.depth_m ?? 0);
        initialLock = `This mission needs Class ${hull.id} · ${hull.threshold} lifetime RP. Free dive is open to ${progress.hull.depthM.toLocaleString('en-US')} m.`;
        // Shared deep-site links become free dives, with the player's pressure rating.
        history.replaceState({}, '', tileUrl(window.location.href, ctx.route.tileId));
        ctx.route = null;
      }
      if (ctx.route) {
        const fitted = progress.hullFor(
          ctx.route.def.briefing.depth_m ?? 0,
          ctx.settings.gameplayMode,
        );
        ctx.route.def.hull_class = fitted;
        const rating = Math.abs(ctx.config.submarine.hullClasses[fitted].ratedDepth).toLocaleString(
          'en-US',
        );
        ctx.route.def.briefing.hazards = ctx.route.def.briefing.hazards.map((hazard) =>
          /Class [ABC]/.test(hazard)
            ? `Class ${fitted} hull · rated to ${rating} m. Stay above the rating.`
            : hazard,
        );
      }
      cleanup.add(
        ctx.bus.on('scan:complete', ({ landmarkId, poiId }) => {
          // Curiosity has its own rewards; avoid also awarding a generic POI.
          if (poiId.startsWith('secret:') || poiId.startsWith('sample:')) return;
          const earned = poiId.startsWith('life:')
            ? progress.award('species', poiId.slice('life:'.length))
            : progress.award('poi', `${landmarkId}/${poiId}`);
          if (earned) ctx.hud.notice(`New discovery · +${earned} RP`);
        }),
      );
      cleanup.add(
        ctx.bus.on('mission:objective', ({ missionId, objectiveId, complete }) => {
          if (complete) progress.award('objective', `${missionId}/${objectiveId}`);
        }),
      );
      cleanup.add(
        ctx.bus.on('mission:primaryComplete', ({ missionId }) =>
          progress.award('primary', missionId),
        ),
      );
      cleanup.add(
        ctx.bus.on('mission:started', () => {
          progress.beginDive();
          boostLeft =
            PROGRESS_CONFIG.boostSeconds * (1 + progress.level('boost') * UPGRADES[6].step);
        }),
      );
      cleanup.add(ctx.bus.on('mission:restart', () => progress.beginDive()));
      ctx.expose({ progress });
      // Keep the pristine profile values for live purchases after every system exists.
      let appliedLevels = JSON.stringify(progress.snapshot().upgrades);
      let boostLevel = progress.level('boost');
      cleanup.add(
        progress.onChange(() => {
          const levels = JSON.stringify(progress.snapshot().upgrades);
          if (!ctx.sub || levels === appliedLevels) return;
          appliedLevels = levels;
          boostLeft +=
            PROGRESS_CONFIG.boostSeconds *
            UPGRADES[6].step *
            (progress.level('boost') - boostLevel);
          boostLevel = progress.level('boost');
          const gameplay = ctx.save.get().gameplay;
          applyProgress(ctx.config, base, progress, gameplay);
          ctx.sub.applyProfiles(
            ctx.config.speedProfiles[gameplay.speedProfile],
            ctx.config.descentProfiles[gameplay.descentProfile],
          );
          ctx.headlights.setPreset(ctx.config.lightPresets[gameplay.lights]);
          ctx.sonar.setSensorRange(ctx.config.sensorPresets[gameplay.sensors].sonarPoiRange);
          const sensor = ctx.config.sensorPresets[gameplay.sensors];
          ctx.config.scan.hintRangeFactor = ctx.baseHintRangeFactor * sensor.hintRangeMultiplier;
          for (const poi of ctx.discovery.pois)
            poi.radius =
              (ctx.baseScanRadii.get(poi.id) ?? poi.radius) * sensor.scanRadiusMultiplier;
        }),
      );
      // Profile updates from settings already read the upgraded profile maps.
    },
    start(ctx) {
      upgrades = new Upgrades(ctx.progress);
      ctx.upgrades = upgrades;
      ctx.expose({ upgrades });
      for (const menu of [
        ctx.home.root.querySelector('.home-menu'),
        ctx.pause.root.querySelector('.pause-actions'),
      ]) {
        if (!menu) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'progress-menu-button';
        button.textContent = 'Upgrades';
        button.onclick = () => upgrades.open();
        menu.append(button);
        cleanup.add(() => button.remove());
      }
      const selectors = [ctx.missionSelect, ctx.homeSites, ctx.pauseSites];
      const updateGlobes = (): void => {
        for (const globe of [ctx.globe, ctx.homeGlobe])
          globe.setMissionAccess((site) => {
            const depth =
              ctx.missionSummaries.find((m) => m.id === site.id)?.depthM ?? site.depthM ?? 0;
            if (ctx.progress.canDive(depth, ctx.save.get().gameplayMode)) return null;
            const hull = requiredHull(depth);
            return `🔒 Class ${hull.id} · ${hull.threshold} lifetime RP required`;
          });
      };
      const updateAccess = (): void => {
        for (const selector of selectors)
          selector.setProgress(ctx.progress, ctx.save.get().gameplayMode);
        updateGlobes();
      };
      updateAccess();
      cleanup.add(
        ctx.save.onChange((_next, changed) => {
          if (changed.includes('gameplayMode')) updateAccess();
        }),
      );
      let lastDisplay = '';
      cleanup.add(
        ctx.progress.onChange(() => {
          const display = `${ctx.progress.lifetime}/${JSON.stringify(ctx.progress.snapshot().ratings)}`;
          if (display === lastDisplay) return;
          lastDisplay = display;
          updateAccess();
        }),
      );
      lastPhotos = ctx.photos.photos;
      if (initialLock) {
        const notice = document.createElement('div');
        notice.className = 'progress-hull-notice';
        notice.setAttribute('role', 'status');
        const text = document.createElement('span');
        text.textContent = initialLock;
        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.textContent = 'Dismiss';
        dismiss.onclick = () => notice.remove();
        notice.append(text, dismiss);
        document.body.append(notice);
        cleanup.add(() => notice.remove());
      }
      ctx.expose({ progressMigrationReady: () => true });
    },
    frame: {
      'gate.photo': (f) => {
        if (upgrades?.isOpen) {
          f.shellFrozen = true;
          f.blocked = true;
          f.frozen = true;
        }
      },
      'sim.vehicles': (f, ctx) => {
        const max =
          PROGRESS_CONFIG.boostSeconds * (1 + ctx.progress.level('boost') * UPGRADES[6].step);
        const dt = f.steps * f.fixedDt * ctx.sub.simSpeed;
        if (f.state.boost && !ctx.rov.deployed) {
          if (boostLeft <= 0) f.state = { ...f.state, boost: false };
          boostLeft = Math.max(0, boostLeft - dt);
        } else boostLeft = Math.min(max, boostLeft + dt * PROGRESS_CONFIG.boostRecoveryPerSecond);
      },
      'play.mission': (_f, ctx) => {
        if (lastPhotos === ctx.photos.photos) return;
        const previous = lastPhotos as readonly { id: string }[];
        const ids = new Set(previous.map((p) => p.id));
        for (const photo of ctx.photos.photos)
          if (!ids.has(photo.id) && photo.poiId)
            ctx.progress.award('photo', `${photo.siteId}/${photo.poiId}`);
        lastPhotos = ctx.photos.photos;
      },
    },
    dispose() {
      cleanup.dispose();
      upgrades?.dispose();
    },
  };
}
