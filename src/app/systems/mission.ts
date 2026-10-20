/**
 * Missions (docs/missions.md): the briefing (freezes the game until "Begin
 * dive" / Enter), objectives panel, completion and the mission debrief.
 * `?skipBriefing=1` starts immediately. D-START / the briefing's
 * Dive settings edit the saved gameplay options, and while the card is up the
 * sub already sits where the dive will start.
 */

import { dailyRatingKey, utcDate } from '../../game/Daily.js';
import {
  MissionRouter,
  missionStartPose,
  type MissionStartPosition,
} from '../../game/MissionRouter.js';
import { tileUrl } from '../../ui/MissionSelect.js';
import type { GameSystem } from '../System.js';
import { missionApproachScanRadius, spawnHeight, spawnSettings } from '../../game/Spawn.js';
import { composedMissionSpawn } from '../../game/DeepOpeningSpawn.js';
import { siteManifest } from '../../core/SiteManifest.js';
import { Disposables } from '../Disposables.js';
import { resolveScanRadius } from '../../game/Scanner.js';

const cleanup = new Disposables();
let approachOpening = false;

export const missionSystem: GameSystem = {
  name: 'mission',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    let disposed = false;
    cleanup.add(() => {
      disposed = true;
    });
    approachOpening = false;
    const { route, params, discovery, meta, terrain, config, sub, rig, headlights, bus } = ctx;
    const { save } = ctx;
    let lastStart: typeof sub.position | null = null;
    let lastChoice: MissionStartPosition = ctx.effective.gameplay.startPosition;
    const originalScanRadii = new Map<string, number>();
    // Also used to preview the start behind the briefing, so Begin
    // resolves the same pose and the dive starts without a teleport.
    const applyMissionStart = (choice: MissionStartPosition): void => {
      if (disposed || ctx.app?.state === 'home') return;
      if (!route || params.has('poi') || params.has('at') || params.has('depth')) return;
      // Cap only mission primaries: Extended sensors must still leave a transit.
      approachOpening = choice === 'near-site';
      const sensor = ctx.effective.sensor;
      for (const objective of route.def.objectives.filter((o) => o.primary)) {
        const poi = discovery.pois.find((p) => p.id === objective.poi);
        if (!poi) continue;
        const original =
          originalScanRadii.get(poi.id) ??
          ctx.baseScanRadii.get(poi.id) ??
          poi.radius / sensor.scanRadiusMultiplier;
        originalScanRadii.set(poi.id, original);
        const radius =
          choice === 'near-site' ? missionApproachScanRadius(route.landmarkId, original) : original;
        ctx.baseScanRadii.set(poi.id, radius);
        poi.radius = resolveScanRadius(radius * sensor.scanRadiusMultiplier, ctx.effective.scan);
      }
      const opening =
        choice === 'near-site'
          ? composedMissionSpawn(
              route.landmarkId,
              route.def.objectives
                .filter((o) => o.primary)
                .flatMap((o) => {
                  const poi = discovery.pois.find((p) => p.id === o.poi);
                  return poi ? [poi] : [];
                }),
              meta,
              terrain,
              ctx.props,
              spawnSettings(config),
              sub.getState().ratedDepth,
              ctx.effective.camera,
            )
          : null;
      const pose =
        opening ??
        missionStartPose(
          { ...route.def, hull_class: sub.getState().hullClass },
          choice,
          discovery.pois,
          meta,
          terrain,
          config,
        );
      if (ctx.daily && !opening) {
        pose.x += ctx.daily.start.x;
        pose.z += ctx.daily.start.z;
        // Keep the small approach variation above the local seabed.
        pose.y = spawnHeight(terrain.sampleHeight(pose.x, pose.z), -pose.y, spawnSettings(config));
        pose.yaw = (ctx.daily.start.headingDeg * Math.PI) / 180;
      }
      sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      lastStart = sub.position.clone();
      lastChoice = choice;
      rig.setChaseRadiusDefault(
        opening?.chaseRadius,
        opening?.chaseOffsetX,
        opening?.chaseOffsetY,
        opening?.portraitChaseOffset,
      );
      rig.snap(sub.position, sub.yaw, sub.pitch);
      headlights.setEnabled(true);
    };
    ctx.applyMissionStart = applyMissionStart;
    const missionRouter = route
      ? new MissionRouter({
          route: {
            ...route,
            def: {
              ...route.def,
              hull_class: sub.getState().hullClass,
              briefing: {
                ...route.def.briefing,
                // The hull line in the meta row already gives the class and rating.
                hazards: route.def.briefing.hazards.filter((hazard) => !/Class [ABC]/.test(hazard)),
              },
            },
          },
          stars: () => ctx.progress.previewStars(ctx.missionRouter!.mission.objectives),
          rating: () => {
            const rating = ctx.progress.finish(
              ctx.daily ? dailyRatingKey(ctx.daily) : route.missionId,
              ctx.missionRouter!.mission.objectives,
              ctx.missionRouter!.mission.endReason === 'abort',
            );
            if (
              ctx.daily &&
              rating.stars > 0 &&
              // Credit the date this run started, even when it ends after UTC midnight.
              ctx.daily.date <= utcDate()
            ) {
              ctx.dailySave.complete(ctx.daily.date);
              ctx.progress.recordDailyStreak(ctx.dailySave.get().streak);
            }
            return rating;
          },
          bus,
          config,
          meta,
          discovery,
          defaultStartPosition: ctx.effective.gameplay.startPosition,
          applyStart: applyMissionStart,
          // D-FLOW: debrief "Dive sites" / "Home" go to the shell without launching a dive.
          onDiveSites: () => {
            history.pushState({}, '', ctx.shellBaseHref());
            ctx.setAppState('home');
            ctx.home.showSites(false);
          },
          onHome: () => {
            history.pushState({}, '', ctx.shellBaseHref());
            ctx.setAppState('home');
          },
          simSpeed: sub.simSpeed,
        })
      : null;
    ctx.missionRouter = missionRouter;
    if (missionRouter) {
      cleanup.add(() => missionRouter.dispose());
      // Home leaves this mission; selections navigate to a fresh dive page.
      cleanup.add(
        bus.on('app:state', ({ state }) => {
          if (state === 'home') missionRouter.dispose();
        }),
      );
    }
    // Optional models may finish after discovery. Reframe a waiting pilot once,
    // while preserving surface choices, URL probes and anyone already moving.
    cleanup.add(
      bus.on('props:loaded', () => {
        if (lastStart && sub.position.distanceTo(lastStart) < 2) applyMissionStart(lastChoice);
      }),
    );

    // Dive settings on the briefing card.
    const briefing = missionRouter?.briefing ?? null;
    if (briefing) {
      const previewStart = (choice: MissionStartPosition): void => {
        void discovery.ready.then(() => {
          if (briefing.isOpen && briefing.startChoice === choice) applyMissionStart(choice);
        });
      };
      briefing.attachDiveSettings({
        settings: save,
        choices: config.settings.gameplayOptions,
        onStartChange: previewStart,
      });
      cleanup.add(
        save.onChange((_next, changed) => {
          if (changed.includes('gameplayMode')) previewStart(briefing.startChoice);
        }),
      );
      previewStart(briefing.startChoice);
    }
    if (briefing && route) {
      const free = document.createElement('a');
      free.href = tileUrl(ctx.shellBaseHref(), route.tileId);
      free.className = 'briefing-free-dive';
      free.textContent = 'Free dive';
      briefing.root.querySelector('.briefing-go')?.prepend(free);
    }
    ctx.expose({ mission: missionRouter?.mission ?? null, missionRouter });
  },
  frame: {
    // fix S: `sub` lets the router turn the end of an emergency blow into the
    // "Dive aborted" debrief (plan/DECISIONS.md failure model).
    'play.mission': (f, ctx) => {
      const mission = ctx.missionRouter?.mission;
      const first = mission?.objectives.find((o) => o.primary);
      const original = ctx.route?.def.objectives.find((o) => o.id === first?.id);
      const target = ctx.discovery.pois.find((p) => p.id === first?.poiId);
      if (first && original && target) {
        const distance = ctx.sub.position.distanceTo(target.position);
        const navigating = approachOpening && !first.complete && distance > target.radius;
        const destination =
          siteManifest(ctx.route!.landmarkId)?.opening?.mission?.destinationLabel ?? target.name;
        const title = navigating ? `Head to ${destination}` : original.title;
        if (first.title !== title) {
          first.title = title;
          ctx.missionRouter!.panel.setObjectives(mission!.objectives);
        }
      }
      // The objectives hint line and the guidance card never show at once: the hint
      // returns when the card empties, so its text is never lost.
      ctx.missionRouter?.panel.setGuided(ctx.guidance.visible);
      ctx.missionRouter?.update(f.clockDt, f.dt, ctx.sub.position, f.sub.headingDeg, f.sub);
    },
  },
};
