/**
 * The settings dialog (C5, docs/settings.md) and live application of display
 * settings (reduce motion, captions, sonar palette, post-processing, UI scale).
 * Built before the mission router so its capture-phase key handler runs first
 * and can keep keys from the briefing / debrief while open.
 */

import { SAVE_KEYS } from '../../core/Save.js';
import { DISCOVERY_VERSION } from '../../game/DiscoveryStore.js';
import { SettingsScreen } from '../../ui/Settings.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const settingsSystem: GameSystem = {
  name: 'settings',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { save, input, config, tier, quality, settings, discovery } = ctx;
    const settingsScreen = new SettingsScreen({
      save,
      input,
      config,
      activeTier: tier,
      activeTierSetting: quality.setting,
      activeDetailStrength: settings.detailStrength,
      activeSimSpeedDefault: settings.simSpeedDefault,
      tierFromUrl: quality.urlForced,
      canOpen: () => !ctx.globe.isOpen,
      onOpen: () => {
        document.exitPointerLock?.();
        ctx.keyboard.unlock();
      },
      onResetProgress: () => {
        if (discovery.store.readOnly) return 'protected';
        let storage: Storage | null;
        try {
          storage = window.localStorage;
        } catch {
          discovery.store.reset();
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
        discovery.store.reset();
        return storage ? 'cleared' : 'sessionOnly';
      },
    });
    ctx.settingsScreen = settingsScreen;

    // D3-FEEL: the pointer-look toggle in the Controls page.
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
        ctx.pointerLook.updateHint();
      },
      true,
    );

    // Saved display settings, at boot and live.
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = (): void => {
      const reduced = save.get().reduceMotion || motionPreference.matches;
      ctx.rig.reduceMotion = reduced;
      ctx.waypoints.setReducedMotion(reduced);
      document.documentElement.dataset.reduceMotion = String(reduced);
    };
    syncMotion();
    motionPreference.addEventListener('change', syncMotion);
    cleanup.add(() => motionPreference.removeEventListener('change', syncMotion));
    ctx.sonar.setPalette(settings.sonarPalette);
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('reduceMotion')) syncMotion();
        if (changed.includes('captions')) ctx.captions.setEnabled(next.captions);
        if (changed.includes('sonarPalette')) ctx.sonar.setPalette(next.sonarPalette);
        if (changed.includes('postFx')) ctx.postFx = next.postFx;
        // D-INPUT-HUD
        if (changed.includes('uiScale'))
          document.documentElement.style.setProperty('--ui-user-scale', String(next.uiScale / 100));
      }),
    );
    ctx.expose({ save, settings: settingsScreen });
  },
};
