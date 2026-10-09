/**
 * Onboarding (F3-ONBOARD): the first-dive tutorial, one-shot contextual hints
 * and the controls card. It only reads input state and game events; it never
 * changes how input is handled. Listed before the settings system so its
 * capture-phase Escape handler closes the card before Settings or Pause react.
 */

import type { InputDevice } from '../../ui/ControlsCard.js';
import { ControlsCard } from '../../ui/ControlsCard.js';
import { HintChip, TutorialCard, tutorialText } from '../../ui/TutorialCard.js';
import type { TutorialKeys } from '../../ui/TutorialCard.js';
import { HINT_TEXT, HintEngine, creatureHintAllowed } from '../../game/Hints.js';
import type { HintLabels } from '../../game/Hints.js';
import { Tutorial } from '../../game/Tutorial.js';
import { TutorialSave } from '../../game/TutorialSave.js';
import type { ActionId } from '../../core/Input.js';
import { FIRST_MINUTE_GUIDANCE } from '../../core/Config.js';
import type { GameContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();
/** Seconds into a dive before the ROV hint is offered. */
const ROV_HINT_AFTER_S = 60;

export function createOnboardSystem(): GameSystem {
  let ctxRef: GameContext | null = null;
  let tutorial = new Tutorial(false);
  let hints = new HintEngine();
  let store = new TutorialSave(null);
  let card: TutorialCard | null = null;
  let chip: HintChip | null = null;
  let diveS = 0;
  let wasLights = false;
  let wasJournal = false;
  let wasPhotoMode = false;
  let photoCount = 0;
  let wasGamepad = false;
  let wasTouch = false;
  let creatureHint = false;

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
        lights: padLabel('toggleLights', 'X'),
        scan: padLabel('scan', 'Right bumper'),
        photo: padLabel('togglePhotoMode', 'Start'),
        journal: key('toggleJournal'),
      };
    return {
      move: key('thrustForward'),
      turn: `${key('yawPort')} or ${key('yawStarboard')}`,
      rise: key('ballastBlow'),
      sink: key('ballastFlood'),
      lights: key('toggleLights'),
      scan: key('scan'),
      photo: key('togglePhotoMode'),
      journal: key('toggleJournal'),
    };
  };

  const hintLabels = (device: InputDevice): HintLabels => {
    const input = ctxRef!.input;
    if (device === 'touch') return { scan: 'SCAN', rov: 'E', photo: 'PHOTO', lights: 'LIGHTS' };
    if (device === 'gamepad')
      return {
        scan: padLabel('scan', 'Right bumper'),
        rov: input.primaryKeyLabel('toggleRov'),
        photo: padLabel('togglePhotoMode', 'Start'),
        lights: padLabel('toggleLights', 'X'),
      };
    return {
      scan: input.primaryKeyLabel('scan'),
      rov: input.primaryKeyLabel('toggleRov'),
      photo: input.primaryKeyLabel('togglePhotoMode'),
      lights: input.primaryKeyLabel('toggleLights'),
    };
  };

  const finishTutorial = (): void => store.save({ tutorialDone: true });

  return {
    name: 'onboard',
    dispose: () => {
      cleanup.dispose();
      card?.dispose();
      chip?.dispose();
      ctxRef?.controlsCard.dispose();
      card = null;
      chip = null;
    },
    init(ctx) {
      ctxRef = ctx;
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
      const root = document.documentElement;
      root.dataset.reduceMotion = String(ctx.settings.reduceMotion);
      cleanup.add(
        ctx.save.onChange((next, changed) => {
          if (changed.includes('reduceMotion'))
            root.dataset.reduceMotion = String(next.reduceMotion);
        }),
      );

      card = new TutorialCard({
        skipStep: () => {
          if (tutorial.skipStep()) onAdvance();
        },
        skipAll: () => {
          if (!tutorial.active) return;
          tutorial.skipAll();
          onAdvance();
        },
      });
      chip = new HintChip(ctx.discovery.overlay.messages);

      // Last input used decides which layout is shown.
      cleanup.listen(window, 'keydown', () => controlsCard.setDevice('keyboard'), {
        capture: true,
        passive: true,
      });
      cleanup.listen(
        window,
        'pointerdown',
        (event) =>
          controlsCard.setDevice(
            (event as PointerEvent).pointerType === 'touch' ? 'touch' : 'keyboard',
          ),
        { capture: true, passive: true },
      );
      // Escape closes the card first, so Settings and Pause stay where they are.
      cleanup.listen(
        window,
        'keydown',
        (event) => {
          if ((event as KeyboardEvent).code !== 'Escape' || !controlsCard.isOpen) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          controlsCard.close();
        },
        true,
      );

      cleanup.add(bus.on('scan:started', () => tutorial.notify('scan') && onAdvance()));
      cleanup.add(bus.on('scan:complete', () => tutorial.notify('scan') && onAdvance()));
      cleanup.add(
        bus.on('mission:started', () => {
          diveS = 0;
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
        const lights = ctx.headlights.on;
        const journal = ctx.discovery.guide.isOpen || ctx.journal.isOpen;
        const photoMode = ctx.photoMode.active;
        const photos = ctx.photos.photos.length;
        if (tutorial.active && dive) {
          if (lights !== wasLights && tutorial.notify('lights')) onAdvance();
          if (journal && !wasJournal && tutorial.notify('journal')) onAdvance();
          if ((photoMode && !wasPhotoMode) || photos > photoCount)
            if (tutorial.notify('photo')) onAdvance();
        }
        wasLights = lights;
        wasJournal = journal;
        wasPhotoMode = photoMode;
        photoCount = photos;

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
        }

        const step = tutorial.step;
        if (card) {
          if (step && playing)
            card.show(tutorial.index, tutorialText(step.id, device, tutorialKeys(device)), device);
          else card.show(null);
        }

        if (!chip) return;
        if (!playing || controlsCard.isOpen) {
          if (chip.visible && !playing) chip.hide();
          return;
        }
        const power = ctx.power.state;
        if (creatureHint && ctx.cameraTips.moved && chip.visible) chip.fade();
        const id = hints.update(f.elapsed, {
          battery: power.enabled ? power.battery : null,
          ratedRatio: f.sub.ratedRatio,
          // The scan panel already gives the target name and hold-to-scan prompt.
          scanTargetInRange: false,
          creatureInView:
            creatureHintAllowed(diveS, ctx.discovery.overlay.cardVisible) &&
            !ctx.cameraTips.moved &&
            (ctx.life?.targets.length ?? 0) > 0,
          rovAvailable:
            device === 'keyboard' &&
            !ctx.rov.deployed &&
            diveS > ROV_HINT_AFTER_S &&
            !f.sub.emergencyBlow,
          canShow: !tutorial.active,
        });
        if (id) {
          creatureHint = id === 'creature';
          store.save({ seenHints: hints.seen });
          chip.show(
            HINT_TEXT[id](hintLabels(device)),
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
    chip?.show('Nice work. The Controls guide is always in the Pause menu.');
  }
}
