/** DOM guidance for POIs. Positions are projected from the real world; this never changes survey data. */
import { Vector3, type Camera } from 'three';
import type { PlacedPoi } from '../game/Pois.js';
import type { Scanner } from '../game/Scanner.js';

type Rect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>;

/** Keep the offscreen arrow nearest its projection, clear of the composed HUD. */
export function clampWaypointLabel(
  preferred: { x: number; y: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  occupied: readonly Rect[],
  gap: number,
): { x: number; y: number } | null {
  if (size.width + gap * 2 > viewport.width || size.height + gap * 2 > viewport.height) return null;
  const clampX = (x: number) => Math.max(gap, Math.min(viewport.width - size.width - gap, x));
  const clampY = (y: number) => Math.max(gap, Math.min(viewport.height - size.height - gap, y));
  const origin = { x: clampX(preferred.x), y: clampY(preferred.y) };
  const xs = [origin.x, ...occupied.flatMap((r) => [r.left - size.width - gap, r.right + gap])];
  const ys = [origin.y, ...occupied.flatMap((r) => [r.top - size.height - gap, r.bottom + gap])];
  let nearest: { x: number; y: number } | null = null;
  let distance = Infinity;
  for (const x of xs.map(clampX)) {
    for (const y of ys.map(clampY)) {
      if (
        occupied.some(
          (r) =>
            x < r.right + gap &&
            x + size.width + gap > r.left &&
            y < r.bottom + gap &&
            y + size.height + gap > r.top,
        )
      )
        continue;
      const d = (x - origin.x) ** 2 + (y - origin.y) ** 2;
      if (d < distance) {
        nearest = { x, y };
        distance = d;
      }
    }
  }
  return nearest;
}

interface WaypointObjective {
  poiId: string;
}

export class Waypoints {
  readonly root: HTMLDivElement;
  private readonly edge: HTMLDivElement;
  private readonly markers = new Map<string, HTMLDivElement>();
  private readonly projection = new Vector3();
  private pois: readonly PlacedPoi[] = [];
  private visualHints = true;

  constructor(
    private readonly scanner: Scanner,
    parent: HTMLElement = document.body,
  ) {
    this.root = document.createElement('div');
    this.root.className = 'd-scan-waypoints';
    this.edge = document.createElement('div');
    this.edge.className = 'd-scan-edge';
    this.root.append(this.edge);
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
  }

  /** The guidance slot owns target text; world navigation uses symbols only. */
  update(camera: Camera, _position: Vector3, objective: WaypointObjective | null): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const current = objective ? this.pois.find((p) => p.id === objective.poiId) : null;
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
    }
    if (!current || !this.visualHints) {
      this.edge.hidden = true;
      return;
    }
    const point = this.projection.copy(current.position).project(camera);
    const onscreen =
      point.z > -1 && point.z < 1 && Math.abs(point.x) < 0.9 && Math.abs(point.y) < 0.85;
    this.edge.hidden = onscreen;
    if (onscreen) return;
    const behind = point.z > 1;
    const x = behind ? -point.x : point.x;
    const y = behind ? -point.y : point.y;
    const angle = Math.atan2(-y, x);
    this.edge.style.setProperty('--direction', `${angle}rad`);
    const size = this.edge.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(this.root).getPropertyValue('--hud-gap')) || 0;
    const occupied = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.sonar, .objectives-panel, .hud-readouts, .guidance-slot, .hud-bar, ' +
          '.tc-stick, .tc-slider, .tc-buttons, .scan-reticle',
      ),
    )
      .filter((el) => el.checkVisibility({ checkVisibilityCSS: true }))
      .map((el) => el.getBoundingClientRect());
    const placement = clampWaypointLabel(
      {
        x: ((x + 1) / 2) * width - size.width / 2,
        y: ((1 - y) / 2) * height - size.height / 2,
      },
      size,
      { width, height },
      occupied,
      gap,
    );
    // A full-screen map may leave no room; its navigation already owns the stage.
    this.edge.hidden = placement === null;
    if (placement) {
      this.edge.style.left = `${placement.x}px`;
      this.edge.style.top = `${placement.y}px`;
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
