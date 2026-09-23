/**
 * Loads `/data/landmarks.json` (written by a separate agent -- treat it as
 * optional and possibly of a shape we do not expect) and places a marker plus a
 * text label for every landmark whose lat/lon falls inside the current tile.
 *
 * The markers are a free-dive navigation aid and are kept deliberately quiet
 * (QA-B #1; art-direction §0 "no loot-sparkle", pillar 3 "found, not
 * signposted"):
 *   - the dot is small, depth-tested (it never pierces a wreck) and fades out
 *     as the camera arrives;
 *   - the label is a fixed number of screen pixels tall at any distance
 *     (`sizeAttenuation: false`), truncated, and fades out on arrival;
 *   - `setVisible(false)` hides everything; main.ts does that whenever a
 *     mission route is active.
 * Sonar blips read `placed` and are unaffected by visibility.
 *
 * Fades and label scale are refreshed from each object's `onBeforeRender`, so
 * no per-frame call is needed; `update(camera, heightPx)` does the same work
 * explicitly (tests, or a caller that wants it).
 */

import * as THREE from 'three';
import { DEFAULT_CONFIG, type LandmarksConfig } from '../core/Config.js';
import { bboxContains, latLonToWorld } from '../util/geo.js';
import { publicUrl } from '../util/publicUrl.js';
import type { Landmark, TileMeta } from '../util/types.js';
import type { Terrain } from './Terrain.js';

export interface PlacedLandmark {
  landmark: Landmark;
  /** World position of the marker. */
  position: THREE.Vector3;
  name: string;
}

/** Accept the several plausible shapes of landmarks.json. */
export function extractLandmarks(doc: unknown): Landmark[] {
  if (Array.isArray(doc)) return doc.filter(isLandmarkish);
  if (typeof doc === 'object' && doc !== null) {
    const o = doc as Record<string, unknown>;
    if (Array.isArray(o.landmarks)) return o.landmarks.filter(isLandmarkish);
    if (Array.isArray(o.features)) {
      // GeoJSON FeatureCollection.
      return o.features
        .map((f) => {
          const feat = f as {
            properties?: Record<string, unknown>;
            geometry?: { coordinates?: number[] };
          };
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) return null;
          return { ...(feat.properties ?? {}), lon: coords[0], lat: coords[1] } as Landmark;
        })
        .filter((l): l is Landmark => l !== null);
    }
    // A plain id -> object map.
    return Object.entries(o)
      .filter(([, v]) => isLandmarkish(v))
      .map(([k, v]) => ({ id: k, ...(v as object) }) as Landmark);
  }
  return [];
}

function isLandmarkish(v: unknown): v is Landmark {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  const lat = o.lat ?? o.latitude;
  const lon = o.lon ?? o.lng ?? o.longitude;
  return typeof lat === 'number' && typeof lon === 'number';
}

/**
 * Normalise a landmark's `depth_m` to our world-Y convention (negative below
 * sea level). data/landmarks.json records depths as POSITIVE magnitudes
 * ("800 m deep"), while world Y is negative, so a positive value is flipped.
 * A negative value is assumed to already be an elevation and passed through.
 */
function toElevation(depthM: number): number {
  return depthM > 0 ? -depthM : depthM;
}

function landmarkLatLon(l: Landmark): { lat: number; lon: number } | null {
  const lat = (l.lat ?? l.latitude) as number | undefined;
  const lon = (l.lon ?? l.lng ?? l.longitude) as number | undefined;
  return typeof lat === 'number' && typeof lon === 'number' ? { lat, lon } : null;
}

/** Cut a label to `maxChars`, ending in an ellipsis when it had to be cut. */
export function truncateLabel(text: string, maxChars: number): string {
  const t = text.trim();
  const max = Math.max(2, Math.floor(maxChars));
  // Array.from counts code points, so a cut never splits a surrogate pair.
  const chars = Array.from(t);
  if (chars.length <= max) return t;
  return (
    chars
      .slice(0, max - 1)
      .join('')
      .trimEnd() + '\u2026'
  );
}

/**
 * Opacity factor for an object that should vanish as the camera arrives:
 * 0 at or inside `near` metres, 1 at or beyond `far`, smoothstep between.
 */
export function fadeByDistance(distanceM: number, near: number, far: number): number {
  if (far <= near) return distanceM >= far ? 1 : 0;
  const t = Math.min(1, Math.max(0, (distanceM - near) / (far - near)));
  return t * t * (3 - 2 * t);
}

/**
 * Sprite `scale.y` that makes a `sizeAttenuation: false` sprite exactly
 * `heightPx` CSS pixels tall under a perspective camera. Three's sprite shader
 * multiplies such a sprite's scale by its view depth, so its NDC height is
 * `scale * P[1][1] = scale / tan(fov/2)`; one NDC unit is half the viewport.
 */
export function labelScaleForPixels(
  heightPx: number,
  fovDeg: number,
  viewportHeightPx: number,
): number {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  return (2 * heightPx * tanHalf) / Math.max(1, viewportHeightPx);
}

interface MarkerParts {
  position: THREE.Vector3;
  dot: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  label: THREE.Sprite | null;
  /** Canvas width / height, to keep the label's aspect ratio. */
  aspect: number;
}

const TMP_SIZE = new THREE.Vector2();

export class Landmarks {
  readonly group = new THREE.Group();
  readonly placed: PlacedLandmark[] = [];

  private readonly parts: MarkerParts[] = [];
  private readonly dotGeometry: THREE.SphereGeometry;

  constructor(
    private readonly meta: TileMeta,
    private readonly config: LandmarksConfig = DEFAULT_CONFIG.landmarks,
  ) {
    this.group.name = 'landmarks';
    this.dotGeometry = new THREE.SphereGeometry(config.markerRadiusM, 12, 8);
  }

  /** Show or hide every marker and label. Sonar blips (`placed`) are unaffected. */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  get visible(): boolean {
    return this.group.visible;
  }

  /** Fetch and place landmarks. Never throws -- a missing file just means none. */
  async load(terrain: Terrain, url = publicUrl('/data/landmarks.json')): Promise<PlacedLandmark[]> {
    let doc: unknown;
    try {
      const res = await fetch(url);
      if (!res.ok) return this.placed;
      doc = await res.json();
    } catch {
      return this.placed;
    }
    this.place(extractLandmarks(doc), terrain);
    return this.placed;
  }

  /** Place an already-parsed list (also used by tests). */
  place(landmarks: Landmark[], terrain: Terrain): PlacedLandmark[] {
    for (const l of landmarks) {
      const ll = landmarkLatLon(l);
      if (!ll || !bboxContains(this.meta.bbox, ll.lat, ll.lon)) continue;

      const { x, z } = latLonToWorld(this.meta, ll.lat, ll.lon);
      // Prefer the landmark's stated depth; otherwise sit it on the seabed.
      const seabed = terrain.sampleHeight(x, z);
      const y = typeof l.depth_m === 'number' ? toElevation(l.depth_m) : seabed;
      const position = new THREE.Vector3(x, y + this.config.markerLiftM, z);
      const name = String(l.name ?? l.id ?? 'landmark');

      const dot = this.makeDot(position);
      this.group.add(dot);
      const made = this.makeLabel(truncateLabel(name, this.config.labelMaxChars));
      const part: MarkerParts = {
        position,
        dot,
        label: made?.sprite ?? null,
        aspect: made?.aspect ?? 1,
      };
      if (part.label) {
        part.label.position.copy(position);
        this.group.add(part.label);
      }
      this.hookFades(part);
      this.parts.push(part);
      this.placed.push({ landmark: l, position, name });
    }
    return this.placed;
  }

  /**
   * Refresh fades and label sizes for a camera and a viewport height (CSS px).
   * Normally driven automatically from `onBeforeRender`.
   */
  update(camera: THREE.Camera, viewportHeightPx: number): void {
    for (const p of this.parts) this.updatePart(p, camera, viewportHeightPx);
  }

  /** Current opacities, for tests and the debug console. */
  opacities(): Array<{ dot: number; label: number | null }> {
    return this.parts.map((p) => ({
      dot: p.dot.material.opacity,
      label: p.label ? p.label.material.opacity : null,
    }));
  }

  private updatePart(p: MarkerParts, camera: THREE.Camera, viewportHeightPx: number): void {
    const c = this.config;
    const d = camera.position.distanceTo(p.position);
    p.dot.material.opacity =
      c.markerOpacity * fadeByDistance(d, c.markerFadeM[0], c.markerFadeM[1]);
    if (p.label) {
      p.label.material.opacity = fadeByDistance(d, c.labelFadeM[0], c.labelFadeM[1]);
      const fov = (camera as THREE.PerspectiveCamera).isPerspectiveCamera
        ? (camera as THREE.PerspectiveCamera).fov
        : 60;
      const sy = labelScaleForPixels(c.labelHeightPx, fov, viewportHeightPx);
      p.label.scale.set(sy * p.aspect, sy, 1);
    }
  }

  /**
   * Three calls `onBeforeRender` after culling and before building the
   * model-view matrix, so opacity and scale set here apply to this frame.
   */
  private hookFades(p: MarkerParts): void {
    p.dot.onBeforeRender = (renderer, _scene, camera) => {
      this.updatePart(p, camera, renderer.getSize(TMP_SIZE).y);
    };
    if (p.label) {
      const label = p.label;
      label.onBeforeRender = (renderer, _scene, camera) => {
        this.updatePart(p, camera, renderer.getSize(TMP_SIZE).y);
        label.updateMatrixWorld();
      };
    }
  }

  private makeDot(position: THREE.Vector3): MarkerParts['dot'] {
    const dot = new THREE.Mesh(
      this.dotGeometry,
      new THREE.MeshBasicMaterial({
        color: this.config.markerColor,
        transparent: true,
        opacity: this.config.markerOpacity,
        depthTest: true,
        depthWrite: false,
        // Fog-free so it stays findable across the tile; depth-tested so it is
        // hidden behind terrain and never pierces a wreck.
        fog: false,
      }),
    );
    dot.name = 'landmark-dot';
    dot.position.copy(position);
    return dot;
  }

  /** Render a label to a canvas texture. Returns null in a non-DOM environment. */
  private makeLabel(text: string): { sprite: THREE.Sprite; aspect: number } | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Drawn at ~2.3x the on-screen height so it stays crisp on HiDPI screens.
    const font = '22px "Space Mono", ui-monospace, monospace';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 20;
    canvas.width = Math.max(32, w);
    canvas.height = 32;
    const c = canvas.getContext('2d');
    if (!c) return null;
    c.font = font;
    c.fillStyle = this.config.labelBackground;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = this.config.labelColor;
    c.textBaseline = 'middle';
    c.fillText(text, 10, canvas.height / 2 + 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        // Always on top of the scene (it is a HUD tag), but fixed-size, so it
        // can never grow into a 300 px banner across the view.
        depthTest: false,
        depthWrite: false,
        fog: false,
        transparent: true,
        sizeAttenuation: false,
        toneMapped: false,
      }),
    );
    sprite.name = 'landmark-label';
    // Anchor below the label's bottom edge: the tag floats just above the dot.
    sprite.center.set(0.5, -0.6);
    sprite.renderOrder = 10;
    return { sprite, aspect: canvas.width / canvas.height };
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh & { material?: THREE.Material & { map?: THREE.Texture | null } };
      mesh.material?.map?.dispose();
      mesh.material?.dispose?.();
    });
    this.dotGeometry.dispose();
    this.group.clear();
    this.parts.length = 0;
    this.placed.length = 0;
  }
}
