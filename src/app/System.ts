/**
 * The game-system contract (F0-CORE).
 *
 * `main.ts` builds a `GameContext` (`app/boot.ts`), then initialises every
 * system in `app/systems.ts` in list order and runs the frame loop
 * (`app/loop.ts`). A system is a small object:
 *
 *   - `init(ctx)`   builds its objects, adds DOM and listeners, and publishes
 *                   what others need on `ctx`. Runs once, in list order, so
 *                   DOM order and listener order match the list.
 *   - `start(ctx)`  optional; runs after every system's `init`, in list order.
 *                   For wiring that must come after all other listeners.
 *   - `frame`       per-frame hooks keyed by stage. Stages run in the order of
 *                   `FRAME_STAGES`; systems sharing a stage run in list order.
 *   - `dispose()`   optional teardown (unused by the page today; tests and a
 *                   future in-page site switch can call it).
 *
 * Adding a system: write `app/systems/<name>.ts`, append it to `app/systems.ts`,
 * and hook into an existing stage (or add a stage name to `FRAME_STAGES` at the
 * point in the frame where it must run). `main.ts` never changes.
 */

import type * as THREE from 'three';
import type { InputState } from '../core/Input.js';
import type { Mission } from '../game/Mission.js';
import type { AtmosphereSample } from '../render/Atmosphere.js';
import type { SubmarineState } from '../sub/Submarine.js';
import type { GameContext } from './context.js';

/**
 * The frame, in order. Each comment names the systems that use the stage
 * today; the order is the pre-F0 `main.ts` frame order, step for step.
 */
export const FRAME_STAGES = [
  'gate.shell', // shell: frozen by the app state, briefing, globe, settings, journal
  'gate.photo', // photo: enter / leave photo mode, final `frozen`
  'gate.pointer', // pointer: drop pointer lock when frozen, pointer-look hint, keyboard lock
  'gate.input', // loop: the input the sim sees and the fixed steps to run
  'sim.vehicles', // rov: deploy / retrieve, then fixed steps for the ROV or the sub
  'sim.power', // power: battery and oxygen drain, emergency ascent when empty
  'sim.contact', // props: push the sub out of props
  'controls.camera', // cameraControls: view toggle, reset, mouse look and wheel
  'controls.sonar', // sonar: M toggles the map
  'controls.vehicle', // submarine: lights, sim speed
  'events', // submarine: collision, crush, hull stress, emergency blow events
  'events.power', // power: free-dive "supplies exhausted" debrief
  'pose', // submarine, rov: meshes and the ROV HUD
  'camera.pilot', // submarine, rov: what the camera follows
  'camera.rig', // camera: rig update
  'camera.rov', // rov: ROV camera offset and aim
  'camera.photo', // photo: viewfinder caption and capture request
  'env.atmosphere', // atmosphere: depth-driven fog and light
  'env.presets', // presets: environment preset for the site
  'env.lighting', // atmosphere: headlights, marine snow, water surface
  'scan.rovRange', // rov: widen scan radii while the ROV pilots
  'scan.discovery', // discovery: scan beam, POIs, journal
  'scan.rovRangeRestore', // rov: restore scan radii
  'guide.waypoints', // waypoints: next objective marker
  'guide.sonar', // sonar: objective and redraw
  'hud.feeds', // power, currents: HUD inputs
  'hud.draw', // hud: readouts and prompts
  'play.mission', // mission: objectives, timers, debrief
  'play.props', // props: LOD
  'play.audio', // audio
  'play.globe', // globe: both globes
  'render.prepare', // terrain: chunk LOD before drawing
  'render.draw', // render: scene (+ post pass) to the canvas
  'render.capture', // photo: read the canvas in the same task as the draw
  'late.input', // input: end-of-frame edge reset
  'late.debug', // render: ?debugTerrain=1 once-a-second log
  'late.perf', // quality: perf counters and dynamic resolution
] as const;

export type FrameStage = (typeof FRAME_STAGES)[number];

/**
 * Per-frame values shared between stages. The loop resets the gate fields each
 * frame; later stages read what earlier stages wrote.
 */
export interface FrameState {
  /** rAF timestamp (ms). */
  nowMs: number;
  /** Real seconds since the previous frame (clamped, `Time.frameDelta`). */
  dt: number;
  /** Fixed physics step (s). */
  fixedDt: number;
  /** Seconds of clamped real time since boot (`Time.elapsed`). */
  elapsed: number;
  /** Input sampled this frame, before freezing. */
  sampled: InputState;
  /** Fixed steps the clock produced this frame. */
  realSteps: number;
  /** gate.shell: frozen by the shell or a modal (not by the debriefs). */
  shellFrozen: boolean;
  /** gate.shell: also blocked by a debrief (ROV and photo mode drop out). */
  blocked: boolean;
  /** gate.shell / gate.photo: nothing simulates this frame. */
  frozen: boolean;
  /** gate.input: `sampled`, or the frozen neutral input. */
  state: Readonly<InputState>;
  /** gate.input: fixed steps to simulate (0 when frozen). */
  steps: number;
  /** gate.input: mission clock / dive time delta (0 when frozen). */
  clockDt: number;
  /** events: the sub's state after this frame's physics. */
  sub: SubmarineState;
  /** camera.pilot: the sub's forward vector. */
  forward: THREE.Vector3;
  /** camera.pilot: the piloted vehicle (ROV when deployed, else the sub). */
  pilotPosition: THREE.Vector3;
  pilotForward: THREE.Vector3;
  pilotYaw: number;
  pilotPitch: number;
  pilotVelocity: THREE.Vector3;
  /** env.atmosphere: this frame's atmosphere sample. */
  atmo: AtmosphereSample;
  /** env.lighting: fog handed to the headlights and the water surface. */
  fog: { color: THREE.Color; density: number };
  /** guide.waypoints: the next unfinished mission objective, if any. */
  nextScanObjective: Mission['objectives'][number] | undefined;
  /** `?debugTerrain=1` and a second since the last debug log. */
  debugLogDue: boolean;
}

export type FrameHook = (f: FrameState, ctx: GameContext) => void;

export interface GameSystem {
  readonly name: string;
  init?(ctx: GameContext): void;
  start?(ctx: GameContext): void;
  frame?: Partial<Record<FrameStage, FrameHook>>;
  dispose?(): void;
}

/** Runs systems: init/start in list order, frame hooks by stage then list order. */
export class SystemRunner {
  private readonly systems: GameSystem[] = [];
  private schedule: Array<{ system: string; stage: FrameStage; hook: FrameHook }> = [];

  constructor(private readonly ctx: GameContext) {}

  /** Initialise each system in order, then run every `start`, then build the frame schedule. */
  init(systems: readonly GameSystem[]): void {
    for (const system of systems) {
      system.init?.(this.ctx);
      this.systems.push(system);
    }
    for (const system of this.systems) system.start?.(this.ctx);
    this.schedule = [];
    for (const stage of FRAME_STAGES) {
      for (const system of this.systems) {
        const hook = system.frame?.[stage];
        if (hook) this.schedule.push({ system: system.name, stage, hook });
      }
    }
  }

  /** Run one frame's hooks in stage order. */
  frame(f: FrameState): void {
    for (const entry of this.schedule) entry.hook(f, this.ctx);
  }

  /** `stage: system` pairs in run order, for docs and tests. */
  get order(): string[] {
    return this.schedule.map((e) => `${e.stage}: ${e.system}`);
  }

  dispose(): void {
    for (const system of [...this.systems].reverse()) system.dispose?.();
    this.systems.length = 0;
    this.schedule = [];
  }
}
