/**
 * Sonar minimap (D-SONAR): relief, POI markers, sensor range from the gameplay
 * options; M toggles the expanded map. `sonarControlsSystem` adds the + / −
 * and wheel zoom and their note in Settings (it needs the settings screen).
 */

import { Sonar } from '../../ui/Sonar.js';
import type { GameSystem } from '../System.js';
import { Disposables } from '../Disposables.js';

const cleanup = new Disposables();

export const sonarSystem: GameSystem = {
  name: 'sonar',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { terrain, landmarks, config, settings, save } = ctx;
    const sonar = new Sonar(terrain, landmarks.placed, {
      palettes: config.sonarPalettes,
      zoom: config.sonarZoom,
    });
    ctx.sonar = sonar;
    sonar.setSensorRange(config.sensorPresets[settings.gameplay.sensors].sonarPoiRange);
    sonar.setMarkersVisible(settings.gameplay.sonarMarkers);
    cleanup.add(
      save.onChange((next, changed) => {
        if (changed.includes('gameplay')) {
          sonar.setSensorRange(config.sensorPresets[next.gameplay.sensors].sonarPoiRange);
          sonar.setMarkersVisible(next.gameplay.sonarMarkers);
        }
      }),
    );
    ctx.expose({ sonar });
  },
  frame: {
    'controls.sonar': (f, ctx) => {
      if (f.state.toggleSonar) ctx.sonar.toggle();
    },
    'guide.sonar': (f, ctx) => {
      ctx.sonar.setObjective(f.nextScanObjective?.poiId ?? null);
      ctx.sonar.update(f.sub);
    },
  },
};

export const sonarControlsSystem: GameSystem = {
  name: 'sonarControls',
  dispose: () => cleanup.dispose(),
  init(ctx) {
    const { settingsScreen, sonar } = ctx;
    const sonarControls = document.createElement('p');
    sonarControls.className = 'settings-note d-sonar-controls';
    sonarControls.textContent =
      'Sonar: M expands the map; + / − change range. Wheel over the map also changes range.';
    settingsScreen.root.querySelector('.settings-bindings')?.before(sonarControls);
    cleanup.listen(window, 'keydown', (event) => {
      if (
        ctx.app.state !== 'dive' ||
        settingsScreen.isOpen ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, select, textarea, button, [contenteditable="true"]')
      )
        return;
      if (event.code === 'Equal' || event.code === 'NumpadAdd') sonar.zoomBy(-1);
      else if (event.code === 'Minus' || event.code === 'NumpadSubtract') sonar.zoomBy(1);
      else return;
      event.preventDefault();
    });
    cleanup.listen(
      window,
      'wheel',
      (event) => {
        if (!sonar.expanded || ctx.app.state !== 'dive') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        sonar.zoomWheel(event.deltaY < 0 ? -1 : 1);
      },
      { capture: true, passive: false },
    );
  },
};
