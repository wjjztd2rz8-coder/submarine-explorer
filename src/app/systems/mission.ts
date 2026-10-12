/**
 * Missions (B3, docs/missions.md): the briefing (freezes the game until "Begin
 * dive" / Enter), objectives panel, completion and the mission debrief.
 * `?skipBriefing=1` starts immediately. D-START / D2-PREDIVE: the briefing's
 * Dive settings edit the saved gameplay options, and while the card is up the
 * sub already sits where the dive will start.
 */

import { dailyRatingKey, utcDate } from '../../game/Daily.js';
import type { Input } from '../../core/Input.js';
import {
  MissionRouter,
  missionStartPose,
  type MissionStartPosition,
} from '../../game/MissionRouter.js';
import { tileUrl } from '../../ui/MissionSelect.js';
import type { GameSystem } from '../System.js';
import {
  MISSION_APPROACH_M,
  missionApproachScanRadius,
  spawnHeight,
  spawnSettings,
} from '../../game/Spawn.js';
import { composedMissionSpawn } from '../../game/DeepOpeningSpawn.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();
let approachOpening = false;
const APPROACH_DESTINATIONS: Readonly<Record<string, string>> = {
  titanic: 'the bow',
  'challenger-deep': "Leggo's lander site",
  'lost-city': 'Poseidon',
  'monterey-canyon': 'the north canyon wall',
  endurance: 'the main hull',
  'axial-seamount-ashes': 'Mushroom vent',
  'hudson-canyon': 'the coral ledge',
  kamaehuakanaloa: 'Hiolo North',
  'beebe-vent-field': 'the Beebe smokers',
  'great-blue-hole': 'the stalactite gallery',
  bismarck: 'the main hull',
  'hunga-tonga-caldera': 'the volcanic rim slope',
  'blake-plateau-corals': 'the coral mound cluster',
};

export const missionSystem: GameSystem = {
  name: 'mission',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    approachOpening = false;
    const { route, params, discovery, meta, terrain, config, sub, rig, headlights, bus } = ctx;
    const { settings, input, save, settingsScreen } = ctx;
    let lastStart: typeof sub.position | null = null;
    let lastChoice: MissionStartPosition = settings.gameplay.startPosition;
    const originalScanRadii = new Map<string, number>();
    // D2-PREDIVE: also used to preview the start behind the briefing, so Begin
    // resolves the same pose and the dive starts without a teleport.
    const applyMissionStart = (choice: MissionStartPosition): void => {
      if (!route || params.has('poi') || params.has('at') || params.has('depth')) return;
      // Cap only mission primaries: Extended sensors must still leave a transit.
      approachOpening = choice === 'near-site';
      const sensor = config.sensorPresets[save.get().gameplay.sensors];
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
        poi.radius = radius * sensor.scanRadiusMultiplier;
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
              config.camera,
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
                hazards: route.def.briefing.hazards.map((hazard) =>
                  /Class [ABC]/.test(hazard)
                    ? `Class ${sub.getState().hullClass} hull · rated to ${Math.abs(sub.getState().ratedDepth).toLocaleString('en-US')} m. Stay above the rating.`
                    : hazard,
                ),
              },
            },
          },
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
          defaultStartPosition: settings.gameplay.startPosition,
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
          keyLabel: (action) =>
            input.primaryKeyLabel(action as Parameters<Input['primaryKeyLabel']>[0]),
        })
      : null;
    ctx.missionRouter = missionRouter;
    // Optional models may finish after discovery. Reframe a waiting pilot once,
    // while preserving surface choices, URL probes and anyone already moving.
    cleanup.add(
      bus.on('props:loaded', () => {
        if (lastStart && sub.position.distanceTo(lastStart) < 2) applyMissionStart(lastChoice);
      }),
    );

    // D-INPUT-HUD: "View controls" in the briefing opens the Controls page.
    const briefingControls = missionRouter?.briefing?.root.querySelector('.briefing-controls');
    if (briefingControls) {
      const controlsButton = document.createElement('button');
      controlsButton.type = 'button';
      controlsButton.textContent = 'View controls';
      controlsButton.addEventListener('click', () => {
        settingsScreen.open();
        settingsScreen.showControls(true);
      });
      briefingControls.replaceChildren(controlsButton);
    }
    // D2-PREDIVE: Dive settings on the briefing card.
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
        const site = ctx.route!.landmarkId;
        const destination = APPROACH_DESTINATIONS[site] ?? target.name;
        const title = navigating ? `Head to ${destination}` : original.title;
        const hint = navigating
          ? `Head to ${destination}, ${MISSION_APPROACH_M[site] ?? 220} m ahead.`
          : original.hint;
        if (first.title !== title || first.hint !== hint) {
          first.title = title;
          first.hint = hint;
          ctx.missionRouter!.panel.setObjectives(mission!.objectives);
        }
      }
      ctx.missionRouter?.update(f.clockDt, f.dt, ctx.sub.position, f.sub.headingDeg, f.sub);
    },
  },
};
