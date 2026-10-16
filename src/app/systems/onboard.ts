/**
 * Onboarding: the first-dive tutorial, one-shot contextual hints and the
 * controls card. Tutorial steps and hints are offered to the guidance slot. It
 * only reads input state and game events; it never changes piloting input. The controls card owns its Escape policy in the
 * shared overlay stack.
 */

import { observeKeyboard } from '../../ui/FocusTrap.js';
import type { InputDevice } from '../../ui/ControlsCard.js';
import { ControlsCard } from '../../ui/ControlsCard.js';
import { HINT_TEXT, HintEngine, creatureHintAllowed, hullHintAllowed } from '../../game/Hints.js';
import type { HintLabels } from '../../game/Hints.js';
import { TUTORIAL_STEPS, Tutorial, tutorialText } from '../../game/Tutorial.js';
import type { TutorialKeys } from '../../game/Tutorial.js';
import { TutorialSave } from '../../game/TutorialSave.js';
import type { GuidanceKind } from '../../game/Guidance.js';
import type { ActionId } from '../../core/Input.js';
import { FIRST_MINUTE_GUIDANCE } from '../../core/Config.js';
import type { GameContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const slotBusy = (kind: GuidanceKind | null): boolean =>
  kind === 'urgent' || kind === 'scan' || kind === 'discovery';

export function createOnboardSystem(): GameSystem {
  const cleanup = new Disposables();
  let ctxRef: GameContext | null = null;
  let tutorial = new Tutorial(false);
  let hints = new HintEngine();
  let store = new TutorialSave(null);
  let diveS = 0;
  let startDepth: number | null = null;
  let wasGamepad = false;
  let wasTouch = false;
  let creatureHint = false;
  let scanCompleted = false;

  const padLabel = (id: ActionId, fallback: string): string =>
    ctxRef?.input.actions.find((a) => a.id === id)?.pad ?? fallback;

  const tutorialKeys = (device: InputDevice): TutorialKeys => {
    const input = ctxRef!.input;
    const key = (id: ActionId): string => input.primaryKeyLabel(id);
    if (device === 'gamepad')
      return {
        move: 'Left stick',
        turn: 'Left stick',
        rise: padLabel('ballastBlow', 'A'),
        sink: padLabel('ballastFlood', 'B'),
        scan: padLabel('scan', 'Right bumper'),
      };
    return {
      move: key('thrustForward'),
      turn: `${key('yawPort')} or ${key('yawStarboard')}`,
      rise: key('ballastBlow'),
      sink: key('ballastFlood'),
      scan: key('scan'),
    };
  };

  const hintLabels = (device: InputDevice): HintLabels => {
    const input = ctxRef!.input;
    if (device === 'touch') return { scan: 'SCAN', photo: 'PHOTO', lights: 'LIGHTS' };
    if (device === 'gamepad')
      return {
        scan: padLabel('scan', 'Right bumper'),
        photo: padLabel('togglePhotoMode', 'Start'),
        lights: padLabel('toggleLights', 'X'),
      };
    return {
      scan: input.primaryKeyLabel('scan'),
      photo: input.primaryKeyLabel('togglePhotoMode'),
      lights: input.primaryKeyLabel('toggleLights'),
    };
  };

  const finishTutorial = (): void => store.save({ tutorialDone: true });

  return {
    name: 'onboard',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      ctxRef = ctx;
      scanCompleted = false;
      const { input, bus, params } = ctx;
      store = new TutorialSave();
      const record = store.get();
      const forced = params.get('tutorial');
      tutorial = new Tutorial(forced === '1' || (forced !== '0' && !record.tutorialDone));
      hints = new HintEngine(record.seenHints);

      const controlsCard = new ControlsCard({
        key: (id) => input.primaryKeyLabel(id),
        input,
        initialDevice: input.touchActive ? 'touch' : 'keyboard',
        onRebind: () => {
          if (!ctx.settingsScreen.isOpen) ctx.settingsScreen.open();
          ctx.settingsScreen.showControls(true);
        },
      });
      ctx.controlsCard = controlsCard;
      cleanup.add(() => controlsCard.dispose());
      const root = document.documentElement;
      root.dataset.reduceMotion = String(ctx.settings.reduceMotion);
      cleanup.add(
        ctx.save.onChange((next, changed) => {
          if (changed.includes('reduceMotion'))
            root.dataset.reduceMotion = String(next.reduceMotion);
        }),
      );

      ctx.guidance.setSkipHandler(() => {
        if (tutorial.skipStep()) onAdvance();
      });
      cleanup.add(() => ctx.guidance.setSkipHandler(null));

      // Last input used decides which layout is shown.
      cleanup.add(
        observeKeyboard((event) => {
          // Match TouchControls: modifiers alone leave the touch layout active.
          if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'].includes(event.code))
            return;
          controlsCard.setDevice('keyboard');
        }),
      );
      cleanup.listen(
        window,
        'pointerdown',
        (event) => {
          const type = (event as PointerEvent).pointerType;
          if (type === 'touch') controlsCard.setDevice('touch');
          else if (type === 'mouse') controlsCard.setDevice('keyboard');
        },
        { capture: true, passive: true },
      );
      cleanup.add(bus.on('scan:started', () => tutorial.notify('scan:started')));
      cleanup.add(
        bus.on('scan:progress', ({ progress }) => {
          tutorial.scanProgress = progress;
        }),
      );
      cleanup.add(bus.on('scan:aborted', () => tutorial.notify('scan:aborted')));
      cleanup.add(
        bus.on('scan:complete', () => {
          // A completed opening target cannot be scanned again this dive.
          // Retain success while earlier steps are still on screen.
          scanCompleted = true;
          if (tutorial.notify('scan:complete')) onAdvance();
          else tutorial.remember('scan:complete');
        }),
      );
      cleanup.add(
        bus.on('mission:started', () => {
          diveS = 0;
          startDepth = null;
          scanCompleted = false;
          tutorial.forgetEarly();
        }),
      );

      ctx.expose({
        controlsCard,
        onboard: {
          get tutorial() {
            return tutorial;
          },
          hints,
          store,
        },
      });
    },
    start(ctx) {
      // A second way into the card, from the Settings header.
      const open =
        ctx.settingsScreen.root.querySelector<HTMLButtonElement>('.settings-controls-open');
      if (!open) return;
      const layout = document.createElement('button');
      layout.type = 'button';
      layout.className = open.className.replace('settings-controls-open', 'settings-layout-open');
      layout.textContent = 'Device layout';
      layout.addEventListener('click', () => ctx.controlsCard.open());
      open.after(layout);
    },
    frame: {
      'hud.draw': (f, ctx) => {
        const { input, controlsCard } = ctx;
        // Gamepad and touch have flags; keyboard and mouse come from events.
        if (input.gamepadActive && !wasGamepad) controlsCard.setDevice('gamepad');
        wasGamepad = input.gamepadActive;
        if (input.touchActive !== wasTouch) {
          wasTouch = input.touchActive;
          if (wasTouch) controlsCard.setDevice('touch');
        }
        const device = controlsCard.device;
        const dive = ctx.app.state === 'dive';
        const playing = dive && !f.frozen && !ctx.photoMode.active;

        if (dive && !f.frozen) diveS += f.dt;
        // Props and POIs can move the initial pose asynchronously. Capture the
        // actual approach, rather than interpreting that teleport as descent.
        if (playing && startDepth === null && ctx.props.loaded && ctx.discovery.loaded)
          startDepth = f.sub.depth;
        if (tutorial.active && playing) {
          if (
            tutorial.update({
              dt: f.dt,
              throttle: f.state.throttle,
              yaw: f.state.yaw,
              ballast: f.state.ballast,
            })
          )
            onAdvance();
          if (scanCompleted && tutorial.notify('scan:complete')) onAdvance();
        }

        const guidance = ctx.guidance;
        const step = tutorial.step;
        const objectiveTitle = ctx.missionRouter?.mission.objectives.find(
          (o) => o.primary && !o.complete,
        )?.title;
        guidance.offer(
          'tutorial',
          'hint',
          step && playing
            ? {
                // Phones keep to one short line beside Skip.
                kicker:
                  device === 'touch'
                    ? ''
                    : `STEP ${tutorial.index + 1} OF ${TUTORIAL_STEPS.length}`,
                text: tutorialText(
                  step.id,
                  device,
                  tutorialKeys(device),
                  tutorial.scanning ? tutorial.scanProgress : null,
                  objectiveTitle?.startsWith('Head to ') ? objectiveTitle.slice(8) : undefined,
                ),
                tone: 'cyan',
                step: step.id,
              }
            : null,
        );

        if (!playing) {
          guidance.offer('hint', 'hint', null);
          return;
        }
        if (controlsCard.isOpen) return;
        const power = ctx.power.state;
        if (creatureHint && ctx.cameraTips.moved) guidance.offer('hint', 'hint', null);
        const id = hints.update(f.elapsed, {
          battery: power.enabled ? power.battery : null,
          ratedRatio: f.sub.ratedRatio,
          hullHintEligible:
            startDepth !== null &&
            hullHintAllowed(diveS, f.sub.depth, startDepth, f.sub.ratedDepth),
          // The scan card already gives the target name and hold-to-scan prompt.
          scanTargetInRange: false,
          // A warning, scan card or result holds the slot; the animal hint waits
          // for it rather than being used up unseen.
          creatureInView:
            creatureHintAllowed(diveS, guidance.visible) &&
            !slotBusy(guidance.kind) &&
            !ctx.cameraTips.moved &&
            (ctx.life?.targets.length ?? 0) > 0,
          canShow: !tutorial.active,
        });
        if (id) {
          creatureHint = id === 'creature';
          store.save({ seenHints: hints.seen });
          // Battery and pressure tips are warnings; the rest are one-shot hints.
          const safety = id === 'battery-low' || id === 'near-hull';
          guidance.flash(
            'hint',
            safety ? 'urgent' : 'hint',
            {
              kicker: safety ? 'WARNING' : 'TIP',
              text: HINT_TEXT[id](hintLabels(device)),
              tone: safety ? 'amber' : 'cyan',
            },
            id === 'creature' ? FIRST_MINUTE_GUIDANCE.lifetimeMs / 1000 : 9,
          );
        }
      },
    },
  };

  function onAdvance(): void {
    if (tutorial.active) return;
    finishTutorial();
    creatureHint = false;
    const guide = ctxRef?.controlsCard?.device === 'touch' ? 'How to play' : 'The Controls guide';
    ctxRef?.guidance.notice(`Nice work. ${guide} is always in the Pause menu.`);
  }
}
