/**
 * The depth-driven light model: what the water column looks like at a given
 * camera depth.
 *
 * Everything visual that is a *function of depth* is decided here and nowhere
 * else -- fog colour and density, ambient and filtered-sun light, the caustic
 * projector, the colour grade handed to the post stack, and the marine-snow
 * density. `Water`, `MarineSnow` and `PostStack` all read the sampled
 * {@link AtmosphereSample} rather than re-deriving depth behaviour.
 *
 * The four stops come from docs/art-direction.md §0 and live in
 * `Config.water.bands`. They are interpolated with a smoothstep, never
 * hard-cut, so the 180 m -> 220 m transition has no visible seam; the *band
 * name* still flips at a stop's depth, and that flip is what
 * `env:depthBand` reports to audio and UI.
 *
 * See docs/atmosphere.md.
 */

import * as THREE from 'three';
import type {
  AtmosphereTier,
  DepthBandName,
  DepthBandSpec,
  GraphicsTier,
  WaterConfig,
} from '../core/Config.js';
import type { EventBus } from '../core/EventBus.js';
import { makeCausticFrames } from './caustics.js';

/** Everything the rest of the render lane needs to know about "how deep". */
export interface AtmosphereSample {
  /** Camera depth in metres (negative below sea level). */
  depth: number;
  /** Which band the camera is *in*: the deepest stop it has reached. */
  band: DepthBandName;
  /** 0 at the surface stop, 1 at the deepest stop. Drives generic murk. */
  depth01: number;
  fogColor: THREE.Color;
  waterColor: THREE.Color;
  fogDensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  sunIntensity: number;
  gradeTint: THREE.Color;
  gradeGain: number;
  gradeSaturation: number;
  vignette: number;
  snowDensity: number;
  snowDriftMps: number;
  /** 1 above `causticsStartM`, easing to 0 at `causticsEndM`. */
  causticsStrength: number;
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/**
 * Which band a depth falls in. Bands are half-open downwards: exactly -200 m
 * is already "midnight".
 */
export function bandAt(bands: DepthBandSpec[], depth: number): DepthBandName {
  let name = bands[0]!.name;
  for (const b of bands) {
    if (depth <= b.depth) name = b.name;
  }
  return name;
}

/** The pair of stops bracketing `depth`, plus the 0..1 blend between them. */
function bracket(bands: DepthBandSpec[], depth: number): [DepthBandSpec, DepthBandSpec, number] {
  const first = bands[0]!;
  const last = bands[bands.length - 1]!;
  if (depth >= first.depth) return [first, first, 0];
  if (depth <= last.depth) return [last, last, 0];
  for (let i = 0; i < bands.length - 1; i++) {
    const a = bands[i]!;
    const b = bands[i + 1]!;
    if (depth <= a.depth && depth > b.depth) {
      return [a, b, smoothstep((a.depth - depth) / (a.depth - b.depth))];
    }
  }
  return [last, last, 0];
}

/**
 * Sample the band curve. Pure apart from writing into `out`, so the unit tests
 * can check the curve without a WebGL context.
 */
export function sampleAtmosphere(
  config: WaterConfig,
  depth: number,
  out: AtmosphereSample = makeSample(),
): AtmosphereSample {
  const bands = config.bands;
  const [a, b, t] = bracket(bands, depth);
  const mix = (x: number, y: number): number => x + (y - x) * t;

  out.depth = depth;
  out.band = bandAt(bands, depth);
  const deepest = bands[bands.length - 1]!.depth;
  out.depth01 = deepest === 0 ? 0 : Math.min(1, Math.max(0, depth / deepest));

  out.fogColor.setHex(a.fogColor).lerp(TMP_A.setHex(b.fogColor), t);
  out.waterColor.setHex(a.waterColor).lerp(TMP_A.setHex(b.waterColor), t);
  out.fogDensity = mix(a.fogDensity, b.fogDensity) * config.fogDensityScale;
  out.ambientColor.setHex(a.ambientColor).lerp(TMP_A.setHex(b.ambientColor), t);
  out.ambientIntensity = mix(a.ambientIntensity, b.ambientIntensity);
  out.sunIntensity = mix(a.sunIntensity, b.sunIntensity);
  out.gradeTint.setHex(a.grade.tint).lerp(TMP_A.setHex(b.grade.tint), t);
  out.gradeGain = mix(a.grade.gain, b.grade.gain);
  out.gradeSaturation = mix(a.grade.saturation, b.grade.saturation);
  out.vignette = mix(a.grade.vignette, b.grade.vignette);
  out.snowDensity = mix(a.snowDensity, b.snowDensity);
  out.snowDriftMps = mix(a.snowDriftMps, b.snowDriftMps);

  // Caustics ease out between the two config depths rather than cutting off.
  const span = config.causticsStartM - config.causticsEndM;
  out.causticsStrength = span <= 0 ? 0 : 1 - smoothstep((config.causticsStartM - depth) / span);
  return out;
}

const TMP_A = new THREE.Color();

export function makeSample(): AtmosphereSample {
  return {
    depth: 0,
    band: 'surface',
    depth01: 0,
    fogColor: new THREE.Color(),
    waterColor: new THREE.Color(),
    fogDensity: 0,
    ambientColor: new THREE.Color(),
    ambientIntensity: 0,
    sunIntensity: 0,
    gradeTint: new THREE.Color(1, 1, 1),
    gradeGain: 1,
    gradeSaturation: 1,
    vignette: 0,
    snowDensity: 0,
    snowDriftMps: 0,
    causticsStrength: 0,
  };
}

/**
 * Installs and drives the scene-wide lighting: fog, background, ambient,
 * filtered sun and the caustic projector.
 */
export class Atmosphere {
  readonly group = new THREE.Group();
  readonly ambient: THREE.AmbientLight;
  /** Weak directional light standing in for sunlight filtered from above. */
  readonly sunlight: THREE.DirectionalLight;
  /** Downward spotlight carrying an animated caustic texture. */
  readonly caustics: THREE.SpotLight | null;
  readonly sample: AtmosphereSample = makeSample();

  private readonly fog: THREE.FogExp2;
  private readonly causticFrames: THREE.Texture[] = [];
  private causticClock = 0;
  private causticFrame = 0;
  private lastBand: DepthBandName | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly config: WaterConfig,
    private readonly tier: AtmosphereTier,
    private readonly bus?: EventBus,
  ) {
    const first = config.bands[0]!;
    this.fog = new THREE.FogExp2(first.fogColor, first.fogDensity * config.fogDensityScale);
    scene.fog = this.fog;
    scene.background = new THREE.Color(first.fogColor);

    this.ambient = new THREE.AmbientLight(first.ambientColor, first.ambientIntensity);
    // Warm sun highlight #FFE9B8 (art-direction §0), angled so slopes shade.
    this.sunlight = new THREE.DirectionalLight(0xffe9b8, first.sunIntensity);
    this.sunlight.position.set(0.25, 1, 0.15);
    this.group.add(this.ambient, this.sunlight, this.sunlight.target);

    if (tier.causticsSize > 0) {
      this.causticFrames = makeCausticFrames(tier.causticsSize);
      const half = config.causticsFootprintM / 2;
      const height = config.causticsFootprintM * 0.8;
      const light = new THREE.SpotLight(
        0xdff3ff,
        0,
        height * 3,
        Math.atan(half / height),
        0.45,
        0, // no decay: this is a projected pattern, not a physical lamp
      );
      light.map = this.causticFrames[0]!;
      light.name = 'caustics';
      this.caustics = light;
      this.group.add(light, light.target);
    } else {
      this.caustics = null;
    }

    scene.add(this.group);
  }

  /**
   * @param depth      camera depth, metres (negative below sea level)
   * @param focus      world point the light rig should centre on (the boat)
   * @param frameDelta real seconds since the last frame
   */
  update(depth: number, focus: THREE.Vector3, frameDelta: number): AtmosphereSample {
    const s = sampleAtmosphere(this.config, depth, this.sample);

    this.fog.color.copy(s.fogColor);
    this.fog.density = s.fogDensity;
    (this.scene.background as THREE.Color).copy(s.fogColor);

    this.ambient.color.copy(s.ambientColor);
    this.ambient.intensity = s.ambientIntensity;
    this.sunlight.intensity = s.sunIntensity;
    // The directional light is infinitely far away, but its *target* must track
    // the boat or shadow/attenuation maths drifts off the tile.
    this.sunlight.target.position.copy(focus);
    this.sunlight.position.copy(focus).add(SUN_DIR);
    this.sunlight.target.updateMatrixWorld();

    if (this.caustics) {
      const strength = s.causticsStrength;
      this.caustics.visible = strength > 0.01;
      if (this.caustics.visible) {
        this.caustics.intensity = this.config.causticsIntensity * strength;
        const height = this.config.causticsFootprintM * 0.8;
        // Project straight down from just under the surface onto the seabed.
        this.caustics.position.set(focus.x, Math.min(-1, depth) + height, focus.z);
        this.caustics.target.position.set(focus.x, depth - height, focus.z);
        this.caustics.target.updateMatrixWorld();

        this.causticClock += frameDelta;
        const period = 1 / Math.max(1, this.config.causticsFps);
        if (this.causticClock >= period) {
          this.causticClock %= period;
          this.causticFrame = (this.causticFrame + 1) % this.causticFrames.length;
          this.caustics.map = this.causticFrames[this.causticFrame]!;
        }
      }
    }

    if (s.band !== this.lastBand) {
      const previous = this.lastBand;
      this.lastBand = s.band;
      this.bus?.emit('env:depthBand', { band: s.band, previous, depth });
    }

    return s;
  }

  /** Which tier this instance was built for (for the debug readout). */
  get tierInfo(): AtmosphereTier {
    return this.tier;
  }

  debugString(): string {
    const s = this.sample;
    return (
      `band=${s.band} fog=${s.fogDensity.toExponential(2)} ` +
      `ambient=${s.ambientIntensity.toFixed(2)} sun=${s.sunIntensity.toFixed(2)} ` +
      `caustics=${s.causticsStrength.toFixed(2)}`
    );
  }

  dispose(): void {
    for (const t of this.causticFrames) t.dispose();
    this.scene.remove(this.group);
    this.scene.fog = null;
  }
}

/** Offset of the (infinitely distant) sun from the focus point. */
const SUN_DIR = new THREE.Vector3(0.25, 1, 0.15).normalize().multiplyScalar(4000);

/** Graphics-tier lookup, so callers do not index `config.tiers` by hand. */
export function atmosphereTier(config: WaterConfig, tier: GraphicsTier): AtmosphereTier {
  return config.tiers[tier];
}
