/**
 * Missions (B3, docs/missions.md): the briefing (freezes the game until "Begin
 * dive" / Enter), objectives panel, completion and the mission debrief.
 * `?skipBriefing=1` starts immediately. D-START / D2-PREDIVE: the briefing's
 * Dive settings edit the saved gameplay options, and while the card is up the
 * sub already sits where the dive will start.
 */

import type { Input } from '../../core/Input.js';
import {
  MissionRouter,
  missionStartPose,
  type MissionStartPosition,
} from '../../game/MissionRouter.js';
import type { GameSystem } from '../System.js';
import { composedFreeDiveSpawn, spawnSettings } from '../../game/Spawn.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const missionSystem: GameSystem = {
  name: 'mission',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { route, params, discovery, meta, terrain, config, sub, rig, headlights, bus } = ctx;
    const { settings, input, save, settingsScreen } = ctx;
    let lastStart: typeof sub.position | null = null;
    let lastChoice: MissionStartPosition = settings.gameplay.startPosition;
    // D2-PREDIVE: also used to preview the start behind the briefing, so Begin
    // resolves the same pose and the dive starts without a teleport.
    const applyMissionStart = (choice: MissionStartPosition): void => {
      if (!route || params.has('poi') || params.has('at') || params.has('depth')) return;
      const opening =
        choice === 'near-site' && save.get().gameplayMode === 'arcade' && ctx.props.loaded
          ? composedFreeDiveSpawn(
              route.landmarkId,
              meta,
              terrain,
              ctx.props,
              spawnSettings(config),
              sub.getState().ratedDepth,
              config.camera,
            )
          : null;
      const pose =
        opening ?? missionStartPose(route.def, choice, discovery.pois, meta, terrain, config);
      sub.reset(pose.x, pose.y, pose.z, pose.yaw);
      lastStart = sub.position.clone();
      lastChoice = choice;
      rig.snap(sub.position, sub.yaw, sub.pitch);
      headlights.setEnabled(true);
    };
    ctx.applyMissionStart = applyMissionStart;
    const missionRouter = route
      ? new MissionRouter({
          route,
          rating: () =>
            ctx.progress.finish(
              route.missionId,
              ctx.missionRouter!.mission.objectives,
              ctx.missionRouter!.mission.endReason === 'abort',
            ),
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
      previewStart(briefing.startChoice);
    }
    ctx.expose({ mission: missionRouter?.mission ?? null, missionRouter });
  },
  frame: {
    // fix S: `sub` lets the router turn the end of an emergency blow into the
    // "Dive aborted" debrief (plan/DECISIONS.md failure model).
    'play.mission': (f, ctx) => {
      ctx.missionRouter?.update(f.clockDt, f.dt, ctx.sub.position, f.sub.headingDeg, f.sub);
    },
  },
};
