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
    const { terrain, landmarks, config } = ctx;
    const sonar = new Sonar(terrain, landmarks.placed, {
      palettes: config.sonarPalettes,
      zoom: config.sonarZoom,
    });
    ctx.sonar = sonar;
    cleanup.add(
      ctx.bus.on('props:loaded', () => {
        sonar.setFootprints(
          ctx.props.placed.flatMap(({ def, root }) =>
            def.procedural === 'hull-block' && def.dimensionsM
              ? [
                  {
                    x: root.position.x,
                    z: root.position.z,
                    lengthM: def.dimensionsM[0] * def.scale[2],
                    widthM: def.dimensionsM[1] * def.scale[0],
                    headingDeg: def.headingDeg,
                  },
                ]
              : [],
          ),
        );
      }),
    );
    sonar.setSensorRange(ctx.effective.sensor.sonarPoiRange);

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
    const canZoom = (): boolean =>
      ctx.app.state === 'dive' &&
      !settingsScreen.isOpen &&
      !ctx.controlsCard?.isOpen &&
      !ctx.globe.isOpen &&
      !ctx.discovery.guide.isOpen &&
      !ctx.discovery.debrief.isOpen &&
      !ctx.photoMode.active &&
      !(ctx.missionRouter?.frozen ?? false);
    cleanup.listen(window, 'keydown', (event) => {
      if (!canZoom() || event.altKey || event.ctrlKey || event.metaKey) return;
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
        if (!sonar.expanded || !canZoom()) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        sonar.zoomWheel(event.deltaY < 0 ? -1 : 1);
      },
      { capture: true, passive: false },
    );
  },
};
