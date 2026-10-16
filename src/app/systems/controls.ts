/** Device reference shared by Home, Pause and Settings; no dive state is required. */
import { detectTouchPrimary } from '../../core/Touch.js';
import { ControlsCard } from '../../ui/ControlsCard.js';
import { observeKeyboard } from '../../ui/FocusTrap.js';
import type { ShellContext } from '../context.js';
import { Disposables } from '../Disposables.js';
import type { GameSystem } from '../System.js';

export function createControlsSystem(): GameSystem<ShellContext, unknown> {
  const cleanup = new Disposables();
  let wasGamepad = false;
  let wasTouch = false;
  return {
    name: 'controls',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const { input } = ctx;
      wasTouch = input.touchActive;
      const controlsCard = new ControlsCard({
        key: (id) => input.primaryKeyLabel(id),
        input,
        initialDevice:
          input.touchActive || ctx.params.get('touch') === '1' || detectTouchPrimary()
            ? 'touch'
            : 'keyboard',
        onRebind: () => {
          if (!ctx.settingsScreen.isOpen) ctx.settingsScreen.open();
          ctx.settingsScreen.showControls(true);
        },
      });
      ctx.controlsCard = controlsCard;
      cleanup.add(() => controlsCard.dispose());
      // Match TouchControls: modifiers and pen input leave the current device alone.
      cleanup.add(
        observeKeyboard((event) => {
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
      ctx.expose({ controlsCard });
    },
    frame: {
      'hud.draw': (_f, ctx) => {
        const { input, controlsCard } = ctx;
        if (input.gamepadActive && !wasGamepad) controlsCard.setDevice('gamepad');
        wasGamepad = input.gamepadActive;
        if (input.touchActive !== wasTouch) {
          wasTouch = input.touchActive;
          if (wasTouch) controlsCard.setDevice('touch');
        }
      },
    },
  };
}
