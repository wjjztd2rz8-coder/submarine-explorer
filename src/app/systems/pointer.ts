/**
 * Pointer and keyboard locks (D-INPUT-HUD, D3-FEEL, D2-CAMERA): fullscreen
 * keyboard lock (so Ctrl+W steers instead of closing the tab), pointer-look
 * capture with its "Click to resume mouse look" hint, pause when the lock is
 * lost, and the one-time Ctrl+W tip.
 */

import { shouldPauseAfterPointerLookLoss, shouldRequestPointerLook } from '../../core/Input.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export function createPointerSystem(): GameSystem {
  let pointerLookWasBlocked = true;
  let wasFrozen = false;
  let pointerLookBlocked: () => boolean = () => true;
  let updatePointerLookHint: () => void = () => {};
  let pointerLookHint: HTMLDivElement | null = null;
  return {
    name: 'pointer',
    dispose: () => cleanup.dispose(),
    init(ctx) {
      const { canvas, input, app } = ctx;
      const lockKeyboard = async (): Promise<void> => {
        const keyboard = (
          navigator as Navigator & {
            keyboard?: { lock?: (keys: string[]) => Promise<void>; unlock?: () => void };
          }
        ).keyboard;
        if (!document.fullscreenElement || !keyboard?.lock) return;
        try {
          await keyboard.lock(['ControlLeft', 'ControlRight', 'KeyW']);
        } catch {
          keyboard.unlock?.();
        }
      };
      const unlockKeyboard = (): void => {
        (navigator as Navigator & { keyboard?: { unlock?: () => void } }).keyboard?.unlock?.();
      };
      ctx.keyboard = { lock: lockKeyboard, unlock: unlockKeyboard };
      cleanup.listen(document, 'fullscreenchange', () => {
        if (document.fullscreenElement) void lockKeyboard();
        else unlockKeyboard();
      });

      // D3-FEEL: pointer look.
      const hint = document.createElement('div');
      pointerLookHint = hint;
      hint.className = 'd3-pointer-look-hint';
      hint.textContent = 'Click to resume mouse look';
      hint.hidden = true;
      hint.style.cssText =
        'position:fixed;left:50%;bottom:5.5rem;transform:translateX(-50%);z-index:25;' +
        'padding:.35rem .7rem;border-radius:4px;background:#061318cc;color:#d8eef0;' +
        'font:12px sans-serif;pointer-events:none';
      document.body.append(hint);
      pointerLookBlocked = (): boolean =>
        app.state !== 'dive' ||
        ctx.pause.isOpen ||
        ctx.settingsScreen.isOpen ||
        ctx.globe.isOpen ||
        ctx.discovery.guide.isOpen ||
        ctx.discovery.debrief.isOpen ||
        (ctx.missionRouter?.frozen ?? false) ||
        (ctx.missionRouter?.debriefOpen ?? false) ||
        ctx.photoMode.active;
      let pointerLockPending = false;
      let swallowPointerLookClick = false;
      updatePointerLookHint = (): void => {
        hint.hidden =
          !shouldRequestPointerLook(
            input.pointerLookEnabled,
            app.state === 'dive',
            pointerLookBlocked(),
            document.pointerLockElement === canvas,
          ) || pointerLockPending;
      };
      ctx.pointerLook = { updateHint: () => updatePointerLookHint() };
      const requestPointerLook = (): void => {
        if (
          pointerLockPending ||
          !shouldRequestPointerLook(
            input.pointerLookEnabled,
            app.state === 'dive',
            pointerLookBlocked(),
            document.pointerLockElement === canvas,
          )
        )
          return;
        pointerLockPending = true;
        updatePointerLookHint();
        try {
          void Promise.resolve(canvas.requestPointerLock()).catch(() => {
            pointerLockPending = false;
            updatePointerLookHint();
          });
        } catch {
          pointerLockPending = false;
          updatePointerLookHint();
        }
      };
      cleanup.listen(document, 'pointerlockchange', () => {
        const locked = document.pointerLockElement === canvas;
        const wasLocked = input.pointerLookActive;
        pointerLockPending = false;
        input.setMouseLook(locked);
        if (
          !locked &&
          shouldPauseAfterPointerLookLoss(
            input.pointerLookEnabled,
            wasLocked,
            app.state === 'dive',
            pointerLookBlocked(),
          )
        ) {
          ctx.setAppState('pause');
        }
        updatePointerLookHint();
      });
      cleanup.listen(document, 'pointerlockerror', () => {
        pointerLockPending = false;
        updatePointerLookHint();
      });
      cleanup.listen(document, 'click', () => {
        if (pointerLookWasBlocked && !pointerLookBlocked()) requestPointerLook();
        pointerLookWasBlocked = pointerLookBlocked();
        updatePointerLookHint();
      });
      cleanup.listen(
        canvas,
        'mousedown',
        (event) => {
          if (event.button !== 0 || hint.hidden) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          swallowPointerLookClick = true;
          requestPointerLook();
        },
        true,
      );
      cleanup.listen(
        canvas,
        'click',
        (event) => {
          if (swallowPointerLookClick) {
            event.preventDefault();
            event.stopImmediatePropagation();
            swallowPointerLookClick = false;
          }
        },
        true,
      );

      // D-INPUT-HUD: a one-time tip the first time Ctrl is pressed in a dive.
      let ctrlTipShown = false;
      try {
        ctrlTipShown =
          JSON.parse(localStorage.getItem('subexplorer.tips.v1') ?? '{}').ctrlW === true;
      } catch {
        /* A session-only tip is still useful. */
      }
      const ctrlTip = document.createElement('div');
      ctrlTip.className = 'hud-ctrl-tip';
      ctrlTip.hidden = true;
      ctrlTip.innerHTML = '<span>Ctrl+W may close this tab. Use C or fullscreen.</span>';
      const dismissTip = document.createElement('button');
      dismissTip.type = 'button';
      dismissTip.textContent = 'Dismiss';
      dismissTip.addEventListener('click', () => {
        ctrlTip.hidden = true;
      });
      const fullscreenTip = document.createElement('button');
      fullscreenTip.type = 'button';
      fullscreenTip.textContent = 'Fullscreen';
      fullscreenTip.addEventListener('click', () => {
        void canvas.requestFullscreen?.().catch(() => {});
        ctrlTip.hidden = true;
      });
      ctrlTip.append(fullscreenTip, dismissTip);
      document.body.append(ctrlTip);
      cleanup.listen(window, 'keydown', (e) => {
        const target = e.target as HTMLElement | null;
        if (
          ctrlTipShown ||
          !['ControlLeft', 'ControlRight'].includes(e.code) ||
          e.repeat ||
          ctx.globe.isOpen ||
          ctx.settingsScreen.isOpen ||
          (ctx.missionRouter?.frozen ?? false) ||
          (target &&
            (target.tagName === 'INPUT' ||
              target.tagName === 'TEXTAREA' ||
              target.isContentEditable))
        )
          return;
        ctrlTipShown = true;
        ctrlTip.hidden = false;
        try {
          localStorage.setItem('subexplorer.tips.v1', JSON.stringify({ ctrlW: true }));
        } catch {
          /* Private storage is optional. */
        }
      });
    },
    frame: {
      'gate.pointer': (f, ctx) => {
        // D2-CAMERA: a modal or pause releases the mouse.
        if (f.frozen && document.pointerLockElement === ctx.canvas) document.exitPointerLock?.();
        // D3-FEEL: show the resume hint once nothing blocks pointer look.
        if (pointerLookWasBlocked && !pointerLookBlocked()) updatePointerLookHint();
        pointerLookWasBlocked = pointerLookBlocked();
        if (pointerLookWasBlocked && pointerLookHint) pointerLookHint.hidden = true;
        // D-INPUT-HUD: re-take the keyboard lock when play resumes.
        if (wasFrozen && !f.frozen) void ctx.keyboard.lock();
        wasFrozen = f.frozen;
      },
    },
  };
}
