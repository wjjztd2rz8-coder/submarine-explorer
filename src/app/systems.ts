/**
 * The ordered system list (F0-CORE). `init` runs top to bottom, so this is also
 * the order objects are built, DOM is appended and listeners are registered;
 * it reproduces the pre-F0 `main.ts` order, which the key handlers and
 * `app:state` listeners depend on (see the notes). Frame hooks run by stage
 * (`FRAME_STAGES` in `System.ts`), then in this order within a stage.
 *
 * To add a system: write `app/systems/<name>.ts` and append it here. Put it
 * earlier only when another system reads its `ctx` field during `init`.
 */

import { createDailySystem } from './systems/daily.js';
import { createProgressSystem } from './systems/progress.js';
import { inputGateSystem } from './loop.js';
import type { GameSystem } from './System.js';
import { atmosphereSystem } from './systems/atmosphere.js';
import { audioSystem } from './systems/audio.js';
import { cameraControlsSystem, cameraSystem } from './systems/camera.js';
import { currentsSystem } from './systems/currents.js';
import { createLifeSystem } from './systems/life.js';
import { discoverySystem } from './systems/discovery.js';
import { hudSystem } from './systems/hud.js';
import { inputSystem } from './systems/input.js';
import { journalSystem } from './systems/journal.js';
import { createOnboardSystem } from './systems/onboard.js';
import { missionSystem } from './systems/mission.js';
import { modesSystem } from './systems/modes.js';
import { createPhotoSystem } from './systems/photo.js';
import { createPointerSystem } from './systems/pointer.js';
import { createPowerSystem } from './systems/power.js';
import { presetsSystem } from './systems/presets.js';
import { propsSystem } from './systems/props.js';
import { createQualitySystem } from './systems/quality.js';
import { renderSystem } from './systems/render.js';
import { createRovSystem } from './systems/rov.js';
import { settingsSystem } from './systems/settings.js';
import { globeSystem, shellKeysSystem, shellSystem } from './systems/shell.js';
import { sonarControlsSystem, sonarSystem } from './systems/sonar.js';
import { createTouchSystem } from './systems/touch.js';
import { createSubmarineSystem } from './systems/submarine.js';
import { waypointsSystem } from './systems/waypoints.js';
import { landmarksSystem, terrainSystem } from './systems/world.js';

/** A fresh list (systems with per-dive state are built by factories). */
export function createSystems(): GameSystem[] {
  return [
    // Research config must be applied before vehicles, power and sensors read it.
    createProgressSystem(),
    // World and vehicle, in scene-build order.
    terrainSystem,
    atmosphereSystem,
    landmarksSystem,
    createSubmarineSystem(),
    cameraSystem,
    // Dive UI and discovery.
    hudSystem,
    sonarSystem,
    discoverySystem,
    // Its capture-phase Escape guard must precede the shell's Escape handler.
    createPowerSystem(),
    waypointsSystem,
    modesSystem,
    propsSystem,
    currentsSystem,
    presetsSystem,
    createLifeSystem(),
    // Shell: home, pause, site lists, then the globes (which open home).
    shellSystem,
    globeSystem,
    // Input and the controls that need it.
    inputSystem,
    cameraControlsSystem,
    createPointerSystem(),
    createTouchSystem(),
    // Onboarding's capture-phase Escape handler must precede Settings and the shell.
    createOnboardSystem(),
    // Before the mission router, so its capture-phase key handler runs first.
    settingsSystem,
    sonarControlsSystem,
    missionSystem,
    createDailySystem(),
    journalSystem,
    createPhotoSystem(),
    // `app:state` listener order: journal, audio, then the initial `dive`
    // emit (shellKeys), then the ROV and photo mode (they miss that emit).
    audioSystem,
    shellKeysSystem,
    renderSystem,
    createRovSystem(),
    createQualitySystem(),
    // Frame-only: `gate.input`.
    inputGateSystem,
  ];
}
