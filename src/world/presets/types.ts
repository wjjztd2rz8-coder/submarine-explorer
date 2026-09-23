/**
 * Shared shapes for the environment presets (docs/presets.md).
 *
 * A preset is a small bundle of site-specific atmosphere layered on top of the
 * depth-band look from `render/Atmosphere.ts`: particles, a few lights, a
 * water current, and gentle adjustments to the sampled fog/ambient/grade. The
 * context is deliberately narrow (plain vectors and small interfaces, not the
 * game objects) so the maths stays testable without WebGL.
 */

import type * as THREE from 'three';
import type { EnvPresetName, PresetParamValue } from '../../core/Config.js';
import type { EventBus } from '../../core/EventBus.js';
import type { AtmosphereSample } from '../../render/Atmosphere.js';

export type PresetParams = Record<string, PresetParamValue>;

/** Terrain as presets see it (satisfied by `Terrain`). */
export interface PresetTerrain {
  sampleHeight(x: number, z: number): number;
  getNormal(x: number, z: number, out?: THREE.Vector3): THREE.Vector3;
  readonly widthM: number;
  readonly depthM: number;
}

/** A placed prop, reduced to what presets need. */
export interface PresetProp {
  id: string;
  /** Raw `model` string, e.g. `procedural:chimney`. */
  model: string;
  /** Top centre of the prop in world space (the orifice for a chimney). */
  top: THREE.Vector3;
  /** Bounding sphere centre and radius (m). */
  centre: THREE.Vector3;
  radius: number;
  /** Height of the prop above its base (m). */
  height: number;
}

export interface PresetPoi {
  id: string;
  kind: string;
  position: THREE.Vector3;
}

/** Everything a preset may read when it is entered. */
export interface PresetEnterContext {
  scene: THREE.Scene;
  terrain: PresetTerrain;
  props: readonly PresetProp[];
  pois: readonly PresetPoi[];
  /** Merged tunables: `Config.presets.<name>` with the mission overrides on top. */
  params: PresetParams;
  /** False on the low tier: build nothing that draws, only currents/events. */
  visuals: boolean;
  /** 0..1 particle budget multiplier for the graphics tier. */
  particleScale: number;
  /** Hard cap on particles for this preset. */
  maxParticles: number;
  /** Where the sub was when the preset was entered (spawn). */
  spawn: THREE.Vector3;
  /** Lat/lon -> world for override keys that name a place. */
  toWorld(lat: number, lon: number): { x: number; z: number };
  bus: EventBus;
}

/** Per-frame inputs. `atmo` is mutable: a preset may adjust it after `Atmosphere.update`. */
export interface PresetFrameContext {
  camera: THREE.PerspectiveCamera;
  subPosition: THREE.Vector3;
  subVelocity: THREE.Vector3;
  atmo: AtmosphereSample;
  terrain: PresetTerrain;
  /** Real seconds since start (animation clock). */
  elapsed: number;
  /** Drawing-buffer height in px, for point-size attenuation. */
  viewportH: number;
  headlightsOn: boolean;
  /**
   * Write the water velocity at the sub here (m/s, world frame). The system
   * sums, caps to `Config.presets.maxCurrentMps` and couples it to the sub.
   */
  current: THREE.Vector3;
  /** Multiplier on the caustic projector's intensity this frame (default 1). */
  causticsScale: number;
  bus: EventBus;
}

export interface EnvPreset {
  readonly name: EnvPresetName;
  enter(ctx: PresetEnterContext): void;
  update(dt: number, ctx: PresetFrameContext): void;
  exit(): void;
  /** Draw calls and particles this preset added (for docs/presets.md and the debug line). */
  readonly stats: { draws: number; particles: number; lights: number };
  /** One short line for `presets.debugString()`. */
  debug?(): string;
}
