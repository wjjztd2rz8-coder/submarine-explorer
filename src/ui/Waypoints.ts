/** DOM guidance for POIs. Positions are projected from the real world; this never changes survey data. */
import { Vector3, type Camera } from 'three';
import type { PlacedPoi } from '../game/Pois.js';
import type { Scanner } from '../game/Scanner.js';

export interface WaypointObjective {
  poiId: string;
  title: string;
  hint?: string;
}

export interface WaypointSonar {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  visible: boolean;
}

export function waypointReadout(
  from: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  radius: number,
): string {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const dz = target.z - from.z;
  const distance = Math.hypot(dx, dy, dz);
  return `${Math.round(distance)} m · ${dy >= 0 ? '↑' : '↓'}${Math.round(Math.abs(dy))} m${distance <= radius ? ' · IN RANGE' : ''}`;
}

/** How long an objective's hint stays on screen after it becomes current. */
const HINT_VISIBLE_MS = 10_000;

export class Waypoints {
  readonly root: HTMLDivElement;
  private readonly edge: HTMLDivElement;
  private readonly hint: HTMLDivElement;
  private readonly edgeName = document.createElement('span');
  private readonly edgeInfo = document.createElement('span');
  private readonly markers = new Map<string, HTMLDivElement>();
  private readonly sonarMarkers = new Map<string, HTMLDivElement>();
  private readonly projection = new Vector3();
  private pois: readonly PlacedPoi[] = [];
  private visualHints = true;
  private hintKey = '';
  private hintShownAt = 0;

  constructor(
    private readonly scanner: Scanner,
    private readonly sonar: WaypointSonar,
    private readonly worldWidthM: number,
    private readonly worldDepthM: number,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'd-scan-waypoints';
    this.edge = document.createElement('div');
    this.edge.className = 'd-scan-edge';
    // Two fixed lines (name, then range/depth) so the chip never wraps mid-phrase.
    this.edgeName.className = 'd-scan-edge-name';
    this.edgeInfo.className = 'd-scan-edge-info';
    this.edge.append(this.edgeName, this.edgeInfo);
    this.hint = document.createElement('div');
    this.hint.className = 'd-scan-objective-hint';
    this.root.append(this.edge, this.hint);
    parent.appendChild(this.root);
  }

  setPois(pois: readonly PlacedPoi[]): void {
    this.pois = pois;
    for (const poi of pois) {
      const marker = document.createElement('div');
      marker.className = 'd-scan-world-marker';
      marker.dataset.poi = poi.id;
      marker.setAttribute('aria-label', poi.name);
      this.root.appendChild(marker);
      this.markers.set(poi.id, marker);
      const sonarMarker = document.createElement('div');
      sonarMarker.className = 'd-scan-sonar-marker';
      sonarMarker.dataset.poi = poi.id;
      sonarMarker.setAttribute('aria-label', poi.name);
      this.sonar.root.appendChild(sonarMarker);
      this.sonarMarkers.set(poi.id, sonarMarker);
    }
  }

  setVisualHints(enabled: boolean): void {
    this.visualHints = enabled;
    this.root.dataset.hints = String(enabled);
  }

  setReducedMotion(enabled: boolean): void {
    this.root.dataset.reduceMotion = String(enabled);
  }

  setPalette(name: string): void {
    this.root.dataset.palette = name;
    this.sonar.root.dataset.scanPalette = name;
  }

  update(camera: Camera, position: Vector3, objective: WaypointObjective | null): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const current = objective ? this.pois.find((p) => p.id === objective.poiId) : null;
    // The hint shows for a while when an objective becomes current, then
    // fades so it does not permanently cover the view; the Esc menu keeps it.
    const hintKey = objective?.hint ? `${objective.poiId}|${objective.hint}` : '';
    if (hintKey !== this.hintKey) {
      this.hintKey = hintKey;
      this.hintShownAt = performance.now();
      this.hint.textContent = objective?.hint ?? '';
    }
    this.hint.hidden = !hintKey || performance.now() - this.hintShownAt > HINT_VISIBLE_MS;
    const canvasWidth = this.sonar.canvas.clientWidth;
    const canvasHeight = this.sonar.canvas.clientHeight;
    for (const poi of this.pois) {
      const scanned = this.scanner.isScanned(poi.landmarkId, poi.id);
      const isCurrent = poi === current && this.visualHints && !scanned;
      const projected = this.projection.copy(poi.position).project(camera);
      const onscreen =
        projected.z > -1 &&
        projected.z < 1 &&
        Math.abs(projected.x) < 0.9 &&
        Math.abs(projected.y) < 0.85;
      const marker = this.markers.get(poi.id);
      if (marker) {
        marker.hidden = !onscreen || (!scanned && !isCurrent);
        marker.classList.toggle('is-scanned', scanned);
        marker.classList.toggle('is-current', isCurrent);
        marker.textContent = scanned ? '✓' : '◇';
        marker.title = scanned ? `${poi.name} · scanned this dive` : poi.name;
        if (!marker.hidden) {
          marker.style.left = `${((projected.x + 1) / 2) * width}px`;
          marker.style.top = `${((1 - projected.y) / 2) * height}px`;
        }
      }
      const sonarMarker = this.sonarMarkers.get(poi.id);
      if (sonarMarker) {
        sonarMarker.hidden = !this.sonar.visible;
        sonarMarker.classList.toggle('is-scanned', scanned);
        sonarMarker.classList.toggle('is-current', isCurrent);
        sonarMarker.textContent = scanned ? '✓' : isCurrent ? '◇' : '·';
        sonarMarker.title = scanned ? `${poi.name} · scanned this dive` : poi.name;
        sonarMarker.style.left = `${6 + ((poi.position.x + this.worldWidthM / 2) / this.worldWidthM) * canvasWidth}px`;
        sonarMarker.style.top = `${6 + ((poi.position.z + this.worldDepthM / 2) / this.worldDepthM) * canvasHeight}px`;
      }
    }
    if (!current || !this.visualHints) {
      this.edge.hidden = true;
      return;
    }
    const point = this.projection.copy(current.position).project(camera);
    this.edge.hidden = false;
    this.edge.classList.toggle(
      'is-onscreen',
      point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.9 && Math.abs(point.y) < 0.85,
    );
    const behind = point.z > 1;
    const x = behind ? -point.x : point.x;
    const y = behind ? -point.y : point.y;
    const angle = Math.atan2(-y, x);
    this.edge.style.left = `${Math.max(130, Math.min(width - 130, ((x + 1) / 2) * width))}px`;
    this.edge.style.top = `${Math.max(100, Math.min(height - 145, ((1 - y) / 2) * height))}px`;
    this.edgeName.textContent = current.name;
    this.edgeInfo.textContent = waypointReadout(position, current.position, current.radius);
    this.edge.style.setProperty('--direction', `${angle}rad`);
  }

  dispose(): void {
    this.root.remove();
    for (const marker of this.sonarMarkers.values()) marker.remove();
  }
}
