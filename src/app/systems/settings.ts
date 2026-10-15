/**
 * The settings dialog (docs/settings.md) and live application of display
 * settings (reduce motion, captions, sonar palette, post-processing, UI scale).
 */

import { SAVE_KEYS } from '../../core/Save.js';
import { DISCOVERY_VERSION } from '../../game/DiscoveryStore.js';
import { SettingsScreen } from '../../ui/Settings.js';
import type { ShellContext } from '../context.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const settingsSystem: GameSystem<ShellContext, unknown> = {
  name: 'settings',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { save, input, config, tier, quality, settings, discoveries } = ctx;
    const settingsScreen = new SettingsScreen({
      save,
      input,
      config,
      activeTier: tier,
      activeTierSetting: quality.setting,
      activeDetailStrength: settings.detailStrength,
      tierFromUrl: quality.urlForced,
      canOpen: () => !ctx.globe.isOpen,
      onOpen: () => {
        document.exitPointerLock?.();
        ctx.keyboard?.unlock();
      },
      onResetProgress: () => {
        if (discoveries.readOnly) return 'protected';
        let storage: Storage | null;
        try {
          storage = window.localStorage;
        } catch {
          discoveries.reset();
          return 'sessionOnly';
        }
        try {
          if (storage) {
            const raw = storage.getItem(SAVE_KEYS.discoveries);
            if (raw) {
              try {
                const version = (JSON.parse(raw) as { version?: unknown }).version;
                if (typeof version === 'number' && version > DISCOVERY_VERSION) return 'protected';
              } catch {
                // A malformed save is safe to discard after confirmation.
              }
            }
            storage.removeItem(SAVE_KEYS.discoveries);
            if (storage.getItem(SAVE_KEYS.discoveries) !== null) return 'unavailable';
          }
        } catch {
          return 'unavailable';
        }
        discoveries.reset();
        return storage ? 'cleared' : 'sessionOnly';
      },
    });
    ctx.settingsScreen = settingsScreen;
    cleanup.add(() => settingsScreen.dispose());

    // The pointer-look toggle in the Controls page.
    const pointerLookButton =
      settingsScreen.root.querySelector<HTMLButtonElement>('.settings-pointer-lock');
    const syncPointerLookButton = (): void => {
      if (pointerLookButton)
        pointerLookButton.textContent = input.pointerLookEnabled
          ? 'Disable pointer look'
          : 'Enable pointer look';
    };
    syncPointerLookButton();
    settingsScreen.root.addEventListener(
      'click',
      (event) => {
        if (event.target !== pointerLookButton) return;
        event.preventDefault();
        event.stopPropagation();
        input.setPointerLookPreference(!input.pointerLookEnabled);
        syncPointerLookButton();
        ctx.pointerLook?.updateHint();
      },
      true,
    );

    // Saved display settings, at boot and live.
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = (): void => {
      const reduced = save.get().reduceMotion || motionPreference.matches;
      if (ctx.rig) ctx.rig.reduceMotion = reduced;
      ctx.waypoints?.setReducedMotion(reduced);
      document.documentElement.dataset.reduceMotion = String(reduced);
    };
    syncMotion();
    motionPreference.addEventListener('change', syncMotion);
    cleanup.add(() => motionPreference.removeEventListener('change', syncMotion));
    ctx.sonar?.setPalette(settings.sonarPalette);
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('reduceMotion')) syncMotion();
        if (changed.includes('captions')) ctx.captions?.setEnabled(next.captions);
        if (changed.includes('sonarPalette')) ctx.sonar?.setPalette(next.sonarPalette);
        if (changed.includes('postFx')) ctx.postFx = next.postFx;
        // D-INPUT-HUD
        if (changed.includes('uiScale'))
          document.documentElement.style.setProperty('--ui-user-scale', String(next.uiScale / 100));
      }),
    );
    ctx.expose({ save, settings: settingsScreen });
  },
};
