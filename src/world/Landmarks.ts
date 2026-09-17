/**
 * Loads `/data/landmarks.json` (written by a separate agent -- treat it as
 * optional and possibly of a shape we do not expect) and places a marker plus a
 * text label for every landmark whose lat/lon falls inside the current tile.
 *
 * Markers are Sprites so they always face the camera and stay legible.
 */

import * as THREE from 'three';
import { bboxContains, latLonToWorld } from '../util/geo.js';
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

export class Landmarks {
  readonly group = new THREE.Group();
  readonly placed: PlacedLandmark[] = [];

  constructor(private readonly meta: TileMeta) {
    this.group.name = 'landmarks';
  }

  /** Fetch and place landmarks. Never throws -- a missing file just means none. */
  async load(terrain: Terrain, url = '/data/landmarks.json'): Promise<PlacedLandmark[]> {
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
      const position = new THREE.Vector3(x, y + 12, z);
      const name = String(l.name ?? l.id ?? 'landmark');

      this.group.add(this.makeMarker(position));
      const label = this.makeLabel(name);
      if (label) {
        label.position.copy(position).add(new THREE.Vector3(0, 60, 0));
        this.group.add(label);
      }
      this.placed.push({ landmark: l, position, name });
    }
    return this.placed;
  }

  private makeMarker(position: THREE.Vector3): THREE.Object3D {
    const marker = new THREE.Group();
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(6, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, fog: false }),
    );
    // A thin vertical pole makes the marker findable from a distance.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 60, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.5 }),
    );
    pole.position.y = 30;
    marker.add(beacon, pole);
    marker.position.copy(position);
    return marker;
  }

  /** Render a label to a canvas texture. Returns null in a non-DOM environment. */
  private makeLabel(text: string): THREE.Sprite | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const font = '28px system-ui, sans-serif';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 24;
    canvas.width = Math.max(64, w);
    canvas.height = 48;
    const c = canvas.getContext('2d');
    if (!c) return null;
    c.font = font;
    c.fillStyle = 'rgba(4, 14, 24, 0.7)';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#ffd97a';
    c.textBaseline = 'middle';
    c.fillText(text, 12, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, depthTest: false, fog: false, transparent: true }),
    );
    // Sprite scale is in world metres; keep the aspect ratio of the canvas.
    sprite.scale.set(canvas.width * 0.7, canvas.height * 0.7, 1);
    return sprite;
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh & { material?: THREE.Material };
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
    });
    this.group.clear();
    this.placed.length = 0;
  }
}
